import unittest
from unittest.mock import AsyncMock, Mock, patch

from worker import MeetingJobRunner
from worker_contract import JobStatus, MeetingJob, WorkerControl


class MeetingHistoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_admission_is_reported_before_optional_audio_setup(self):
        client = Mock()
        client.report = AsyncMock(return_value=WorkerControl())
        job = MeetingJob.from_dict({
            "job_id": "3bc5eb85-8ac7-4d8a-b7c2-4b35dc3fdbdd",
            "meeting_id": 12,
            "workspace_id": 8,
            "meet_url": "https://meet.google.com/abc-defg-hij",
            "starts_at": "2026-08-21T09:00:00Z",
            "livekit_url": "wss://livekit.example.com",
            "livekit_token": "token",
        })
        browser = Mock(start=AsyncMock(), stop=AsyncMock())
        meet = Mock(
            join=AsyncMock(),
            unmute=AsyncMock(side_effect=RuntimeError("audio setup failed")),
            leave=AsyncMock(),
        )
        capture = Mock()

        with (
            patch("worker.BrowserManager", return_value=browser),
            patch("worker.MeetWorker", return_value=meet),
            patch("worker.AudioCapturePipeline", return_value=capture),
            patch("worker.AudioInjectionPipeline", return_value=Mock()),
        ):
            await MeetingJobRunner(client).run(job)

        statuses = [call.args[1] for call in client.report.await_args_list]
        self.assertEqual(
            statuses,
            [
                JobStatus.STARTING,
                JobStatus.AUTHENTICATING,
                JobStatus.WAITING_FOR_ADMISSION,
                JobStatus.JOINED,
                JobStatus.FAILED,
            ],
        )


if __name__ == "__main__":
    unittest.main()
