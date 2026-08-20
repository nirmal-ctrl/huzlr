import asyncio
import logging
from typing import Optional

import numpy as np
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
        self._received_agent_audio = False
        self._detected_meet_audio = False
        self._published_meet_frames = 0

    async def start(self):
        self.room.on("track_subscribed", self._on_track_subscribed)
        await self.room.connect(self.url, self.token)
        self.source = rtc.AudioSource(sample_rate=16000, num_channels=1, queue_size_ms=200)
        track = rtc.LocalAudioTrack.create_audio_track("google-meet-audio", self.source)
        await self.room.local_participant.publish_track(track, self._microphone_publish_options())
        logger.info("Published Google Meet audio as a LiveKit microphone track")
        self.injection.start()
        self._input_task = asyncio.create_task(self._publish_meet_audio())
        logger.info("LiveKit Meet audio bridge connected")

    @staticmethod
    def _microphone_publish_options():
        options = rtc.TrackPublishOptions()
        options.source = rtc.TrackSource.SOURCE_MICROPHONE
        return options

    def _on_track_subscribed(self, track, publication, participant):
        if not self._is_agent_audio_track(track, participant):
            logger.warning(
                "Ignoring non-agent LiveKit track from participant %s",
                getattr(participant, "identity", "unknown"),
            )
            return
        logger.info(
            "Subscribed to Scrum Master audio track from %s",
            getattr(participant, "identity", "unknown"),
        )
        task = asyncio.create_task(self._inject_agent_audio(track))
        self._output_tasks.add(task)
        task.add_done_callback(self._output_tasks.discard)

    @staticmethod
    def _is_agent_audio_track(track, participant) -> bool:
        return (
            track.kind == rtc.TrackKind.KIND_AUDIO
            and getattr(participant, "kind", None) == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT
        )

    async def _publish_meet_audio(self):
        while True:
            chunk = await asyncio.to_thread(self.capture.read_chunk, 1.0)
            if not chunk or not self.source:
                continue
            self._published_meet_frames += 1
            samples = np.frombuffer(chunk, dtype=np.int16).astype(np.float32) / 32768.0
            rms = float(np.sqrt(np.mean(samples ** 2))) if len(samples) else 0.0
            if not self._detected_meet_audio and rms >= 0.002:
                self._detected_meet_audio = True
                logger.info("Detected participant audio from Google Meet (RMS %.4f)", rms)
            elif not self._detected_meet_audio and self._published_meet_frames == 250:
                logger.warning("Google Meet capture has remained silent for the first five seconds")
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
                if not self._received_agent_audio:
                    self._received_agent_audio = True
                    logger.info("Received first Scrum Master audio frame for Meet injection")
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
