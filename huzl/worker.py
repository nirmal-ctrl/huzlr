import asyncio
import json
import logging
import signal
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Optional

from bridge.audio_capture import AudioCapturePipeline
from bridge.audio_injection import AudioInjectionPipeline
from bridge.browser_manager import BrowserManager
from bridge.meet_worker import MeetWorker
from worker_contract import JobStatus, MeetingJob, WorkerControl
from worker_settings import load_worker_settings
from agent.livekit_bridge import LiveKitMeetAudioBridge


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.worker")


class WorkerApiClient:
    def __init__(self, base_url: str, worker_key: str):
        self.base_url = base_url.rstrip("/")
        self.worker_key = worker_key

    def _request(self, method: str, path: str, payload: Optional[dict] = None):
        body = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=body,
            method=method,
            headers={"X-Huzl-Worker-Key": self.worker_key, "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                if response.status == 204:
                    return None
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as exc:
            if exc.code == 204:
                return None
            detail = exc.read().decode(errors="replace")
            raise RuntimeError(f"Worker API returned {exc.code}: {detail}") from exc

    async def claim(self) -> Optional[MeetingJob]:
        payload = await asyncio.to_thread(self._request, "POST", "/api/v1/scrum-master/worker/jobs/claim")
        return MeetingJob.from_dict(payload) if payload else None

    async def report(self, job_id: str, status: JobStatus, error_code: str = "", error_message: str = "") -> WorkerControl:
        payload = await asyncio.to_thread(
            self._request,
            "POST",
            f"/api/v1/scrum-master/worker/jobs/{job_id}/status",
            {"status": status.value, "error_code": error_code or None, "error_message": error_message or None},
        )
        return WorkerControl(cancel_requested=bool(payload and payload.get("cancel_requested")))


class MeetingJobRunner:
    def __init__(self, client: WorkerApiClient):
        self.client = client

    async def run(self, job: MeetingJob):
        browser = BrowserManager()
        meet = MeetWorker(browser)
        capture = AudioCapturePipeline()
        injection = AudioInjectionPipeline()
        voice_bridge = None
        try:
            await self.client.report(job.job_id, JobStatus.STARTING)
            await browser.start()
            await self.client.report(job.job_id, JobStatus.AUTHENTICATING)
            await self.client.report(job.job_id, JobStatus.WAITING_FOR_ADMISSION)
            await meet.join(job.meet_url, job.bot_name)
            # Admission is the durable history boundary. Report it before optional
            # audio/agent setup so an integration failure cannot erase a real join.
            await self.client.report(job.job_id, JobStatus.JOINED)
            capture.start()
            if job.livekit_url and job.livekit_token:
                await meet.unmute()
                voice_bridge = LiveKitMeetAudioBridge(job.livekit_url, job.livekit_token, capture, injection)
                await voice_bridge.start()
            else:
                logger.warning("LiveKit is not configured; meeting will run in listen-only mode")
            deadline = asyncio.get_running_loop().time() + job.max_duration_minutes * 60
            next_check = asyncio.get_running_loop().time()
            while asyncio.get_running_loop().time() < deadline:
                if not voice_bridge:
                    await asyncio.to_thread(capture.read_chunk, 1.0)
                else:
                    await asyncio.sleep(0.25)
                if asyncio.get_running_loop().time() >= next_check:
                    if not await meet.is_connected():
                        break
                    control = await self.client.report(job.job_id, JobStatus.JOINED)
                    if control.cancel_requested:
                        await self.client.report(job.job_id, JobStatus.CANCELLED)
                        return
                    next_check = asyncio.get_running_loop().time() + 5

            await self.client.report(job.job_id, JobStatus.LEAVING)
            await meet.leave()
            await self.client.report(job.job_id, JobStatus.COMPLETED)
        except Exception as exc:
            logger.exception("Meeting job %s (meeting %s) failed", job.job_id, job.meeting_id)
            try:
                error_code = getattr(exc, "code", type(exc).__name__.upper())
                await self.client.report(job.job_id, JobStatus.FAILED, error_code, str(exc)[:1000])
            except Exception:
                logger.exception("Could not report job failure")
        finally:
            if voice_bridge:
                await voice_bridge.stop()
            capture.stop()
            await meet.leave()
            await browser.stop()


async def main():
    settings = load_worker_settings()

    client = WorkerApiClient(settings.backend_url, settings.worker_key)
    runner = MeetingJobRunner(client)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    logger.info("Huzl worker polling %s", settings.backend_url)
    while not stop.is_set():
        try:
            job = await client.claim()
            if job:
                await runner.run(job)
                continue
        except Exception:
            logger.exception("Worker polling failed")
        try:
            await asyncio.wait_for(stop.wait(), timeout=5)
        except asyncio.TimeoutError:
            pass


if __name__ == "__main__":
    asyncio.run(main())
