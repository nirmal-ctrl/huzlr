import asyncio
import logging
from typing import Optional

from livekit import rtc

from bridge.audio_capture import AudioCapturePipeline
from bridge.audio_injection import AudioInjectionPipeline


logger = logging.getLogger("huzl.livekit_bridge")


class LiveKitMeetAudioBridge:
    """Bridges 16 kHz mono PCM between Google Meet devices and a LiveKit room."""

    def __init__(self, url: str, token: str, capture: AudioCapturePipeline, injection: AudioInjectionPipeline):
        self.url = url
        self.token = token
        self.capture = capture
        self.injection = injection
        self.room = rtc.Room()
        self.source: Optional[rtc.AudioSource] = None
        self._input_task: Optional[asyncio.Task] = None
        self._output_tasks: set[asyncio.Task] = set()

    async def start(self):
        self.room.on("track_subscribed", self._on_track_subscribed)
        await self.room.connect(self.url, self.token)
        self.source = rtc.AudioSource(sample_rate=16000, num_channels=1, queue_size_ms=200)
        track = rtc.LocalAudioTrack.create_audio_track("google-meet-audio", self.source)
        await self.room.local_participant.publish_track(track)
        self.injection.start()
        self._input_task = asyncio.create_task(self._publish_meet_audio())
        logger.info("LiveKit Meet audio bridge connected")

    def _on_track_subscribed(self, track, publication, participant):
        if track.kind != rtc.TrackKind.KIND_AUDIO:
            return
        task = asyncio.create_task(self._inject_agent_audio(track))
        self._output_tasks.add(task)
        task.add_done_callback(self._output_tasks.discard)

    async def _publish_meet_audio(self):
        while True:
            chunk = await asyncio.to_thread(self.capture.read_chunk, 1.0)
            if not chunk or not self.source:
                continue
            frame = rtc.AudioFrame(
                data=chunk,
                sample_rate=16000,
                num_channels=1,
                samples_per_channel=len(chunk) // 2,
            )
            await self.source.capture_frame(frame)

    async def _inject_agent_audio(self, track):
        stream = rtc.AudioStream(track, sample_rate=16000, num_channels=1, frame_size_ms=20)
        try:
            async for event in stream:
                self.injection.write_chunk(event.frame.data.tobytes())
        finally:
            await stream.aclose()

    async def stop(self):
        if self._input_task:
            self._input_task.cancel()
            await asyncio.gather(self._input_task, return_exceptions=True)
        for task in self._output_tasks:
            task.cancel()
        if self._output_tasks:
            await asyncio.gather(*self._output_tasks, return_exceptions=True)
        self.injection.stop()
        if self.source:
            await self.source.aclose()
        await self.room.disconnect()
        logger.info("LiveKit Meet audio bridge disconnected")

