import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from livekit import rtc

from agent.livekit_bridge import LiveKitMeetAudioBridge
from bridge.audio_capture import AudioCapturePipeline
from bridge.audio_injection import AudioInjectionPipeline
from bridge.meet_states import has_microphone_error, is_waiting_for_admission
from bridge.meet_worker import MeetWorker


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
    def test_publishes_meet_audio_as_microphone(self):
        options = LiveKitMeetAudioBridge._microphone_publish_options()

        self.assertEqual(options.source, rtc.TrackSource.SOURCE_MICROPHONE)

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


class MeetStateSafetyTests(unittest.TestCase):
    def test_waiting_room_is_not_admission(self):
        self.assertTrue(
            is_waiting_for_admission("Please wait until a meeting host brings you into the call")
        )

    def test_in_call_text_is_not_waiting_room(self):
        self.assertFalse(is_waiting_for_admission("You are in the call with 3 participants"))

    def test_detects_missing_microphone(self):
        self.assertTrue(has_microphone_error("Microphone not found"))


class MeetWorkerAdmissionTests(unittest.IsolatedAsyncioTestCase):
    def make_worker(self, body_text: str):
        worker = MeetWorker(SimpleNamespace(context=None))
        worker.page = MagicMock()
        worker.page.is_closed.return_value = False
        body = MagicMock()
        body.inner_text = AsyncMock(return_value=body_text)
        worker.page.locator.return_value = body
        return worker

    async def test_waiting_lobby_does_not_count_as_connected(self):
        worker = self.make_worker("Please wait until a meeting host brings you into the call")
        hangup = MagicMock()
        hangup.is_visible = AsyncMock(return_value=True)
        worker.page.query_selector = AsyncMock(return_value=hangup)

        self.assertFalse(await worker.is_connected())
        worker.page.query_selector.assert_not_awaited()

    async def test_in_call_leave_control_confirms_connection(self):
        worker = self.make_worker("You are in the call with 3 participants")
        hangup = MagicMock()
        hangup.is_visible = AsyncMock(return_value=True)
        worker.page.query_selector = AsyncMock(return_value=hangup)

        self.assertTrue(await worker.is_connected())


if __name__ == "__main__":
    unittest.main()
