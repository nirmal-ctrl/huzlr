import unittest
from types import SimpleNamespace
from unittest.mock import patch

from livekit import rtc

from agent.livekit_bridge import LiveKitMeetAudioBridge
from bridge.audio_capture import AudioCapturePipeline
from bridge.audio_injection import AudioInjectionPipeline


class RequiredAudioDeviceTests(unittest.TestCase):
    @patch("bridge.audio_capture.sd.query_devices", return_value=[{"name": "Built-in Microphone"}])
    def test_capture_rejects_system_device_fallback(self, _query_devices):
        pipeline = AudioCapturePipeline()

        with self.assertRaisesRegex(RuntimeError, "Required audio capture device"):
            pipeline._find_device_index()

    @patch("bridge.audio_injection.sd.query_devices", return_value=[{"name": "Built-in Output"}])
    def test_injection_rejects_system_device_fallback(self, _query_devices):
        pipeline = AudioInjectionPipeline()

        with self.assertRaisesRegex(RuntimeError, "Required audio injection device"):
            pipeline._find_device_index()

    @patch(
        "bridge.audio_capture.sd.query_devices",
        return_value=[{"name": "Built-in Microphone"}, {"name": "huzlr_Virtual_Speaker"}],
    )
    def test_capture_selects_named_virtual_device(self, _query_devices):
        self.assertEqual(AudioCapturePipeline()._find_device_index(), 1)


class LiveKitTrackSafetyTests(unittest.TestCase):
    def test_accepts_agent_audio(self):
        track = SimpleNamespace(kind=rtc.TrackKind.KIND_AUDIO)
        participant = SimpleNamespace(kind=rtc.ParticipantKind.PARTICIPANT_KIND_AGENT)

        self.assertTrue(LiveKitMeetAudioBridge._is_agent_audio_track(track, participant))

    def test_rejects_standard_participant_audio(self):
        track = SimpleNamespace(kind=rtc.TrackKind.KIND_AUDIO)
        participant = SimpleNamespace(kind=rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD)

        self.assertFalse(LiveKitMeetAudioBridge._is_agent_audio_track(track, participant))

    def test_rejects_participant_without_kind(self):
        track = SimpleNamespace(kind=rtc.TrackKind.KIND_AUDIO)

        self.assertFalse(LiveKitMeetAudioBridge._is_agent_audio_track(track, SimpleNamespace()))

    def test_rejects_agent_video(self):
        track = SimpleNamespace(kind=rtc.TrackKind.KIND_VIDEO)
        participant = SimpleNamespace(kind=rtc.ParticipantKind.PARTICIPANT_KIND_AGENT)

        self.assertFalse(LiveKitMeetAudioBridge._is_agent_audio_track(track, participant))


if __name__ == "__main__":
    unittest.main()
