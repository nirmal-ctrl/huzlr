import asyncio
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from google.genai import types
from livekit.plugins import deepgram, google

from huzlr_agents.agents import scrum_master
from huzlr_agents.config import AgentSettings
from huzlr_agents.contracts import ScrumMasterConversationConfig, SCRUM_MASTER_AGENT_NAME


def settings(**overrides):
    return AgentSettings(
        agent_type="scrum_master",
        api_url="https://api.example.test",
        service_key="test-service-key",
        gemini_api_key="test-google-key",
        **overrides,
    )


class ScrumMasterSessionTests(unittest.IsolatedAsyncioTestCase):
    async def test_existing_pipeline_constructs_with_upgraded_sdk(self):
        with patch.dict(os.environ, {
            "DEEPGRAM_API_KEY": "test-deepgram-key",
            "LIVEKIT_API_KEY": "test-livekit-key",
            "LIVEKIT_API_SECRET": "test-livekit-secret",
            "LIVEKIT_URL": "wss://example.livekit.cloud",
        }), patch.object(scrum_master.silero.VAD, "load", return_value=MagicMock()):
            session = scrum_master.build_session(settings(), ScrumMasterConversationConfig())
        try:
            self.assertIsInstance(session.stt, deepgram.STT)
            self.assertIsInstance(session.llm, google.LLM)
            self.assertIsNotNone(session.tts)
        finally:
            await session.stt.aclose()
            await session.llm.aclose()
            await session.tts.aclose()
            await session.aclose()

    async def test_native_audio_uses_real_realtime_plugin_without_stt_or_tts(self):
        session = scrum_master.build_session(settings(), ScrumMasterConversationConfig(voice_mode="gemini_live"))
        try:
            self.assertIsInstance(session.llm, google.realtime.RealtimeModel)
            self.assertTrue(session.llm.capabilities.user_transcription)
            self.assertIsNone(session.stt)
            self.assertIsNone(session.tts)
        finally:
            await session.llm.aclose()
            await session.aclose()

    async def test_native_settings_and_transcriptions_are_passed_to_provider(self):
        with patch.object(scrum_master.google.realtime, "RealtimeModel") as model, \
                patch.object(scrum_master, "AgentSession") as session, \
                patch.object(scrum_master.deepgram, "STT") as stt, \
                patch.object(scrum_master.silero.VAD, "load") as vad:
            scrum_master.build_session(
                settings(gemini_live_model="test-native-model", gemini_live_voice="Kore"),
                ScrumMasterConversationConfig(voice_mode="gemini_live"),
            )
        options = model.call_args.kwargs
        self.assertEqual(options["model"], "test-native-model")
        self.assertEqual(options["voice"], "Kore")
        self.assertEqual(options["api_key"], "test-google-key")
        self.assertEqual(options["modalities"], [types.Modality.AUDIO])
        self.assertIsInstance(options["input_audio_transcription"], types.AudioTranscriptionConfig)
        self.assertIsInstance(options["output_audio_transcription"], types.AudioTranscriptionConfig)
        self.assertIsNotNone(options["context_window_compression"].sliding_window)
        self.assertFalse(options["thinking_config"].include_thoughts)
        self.assertEqual(set(session.call_args.kwargs), {"llm"})
        stt.assert_not_called()
        vad.assert_not_called()

    async def test_existing_pipeline_still_uses_deepgram_and_gemini_text(self):
        with patch.object(scrum_master.google, "LLM") as model, \
                patch.object(scrum_master, "AgentSession") as session, \
                patch.object(scrum_master.deepgram, "STT") as stt, \
                patch.object(scrum_master.silero.VAD, "load") as vad:
            scrum_master.build_session(settings(), ScrumMasterConversationConfig())
        self.assertEqual(model.call_args.kwargs["model"], "gemini-2.5-flash")
        self.assertEqual(session.call_args.kwargs["tts"], "deepgram/aura-2:odysseus")
        stt.assert_called_once()
        vad.assert_called_once()

    async def test_native_greeting_uses_audio_generation_without_separate_tts(self):
        session = SimpleNamespace(generate_reply=AsyncMock(), say=AsyncMock())
        await scrum_master.introduce(
            session, ScrumMasterConversationConfig(voice_mode="gemini_live", introduction_message="Hello team.")
        )
        self.assertIn("Hello team.", session.generate_reply.await_args.kwargs["instructions"])
        self.assertEqual(session.generate_reply.await_args.kwargs["tool_choice"], "none")
        session.say.assert_not_awaited()
        await scrum_master.introduce(session, ScrumMasterConversationConfig(introduction_message="Good morning."))
        session.say.assert_awaited_once_with("Good morning.", allow_interruptions=True)

    async def test_native_audio_requires_a_provider_key(self):
        config = AgentSettings("scrum_master", "https://api.example.test", "key", "")
        with self.assertRaisesRegex(RuntimeError, "GOOGLE_API_KEY or GEMINI_API_KEY"):
            scrum_master.build_session(config, ScrumMasterConversationConfig(voice_mode="gemini_live"))

    async def test_native_turns_persist_and_context_tools_survive_session_cleanup(self):
        callbacks = {}
        session = MagicMock()
        session.on.side_effect = lambda name, callback: callbacks.update({name: callback})
        session.generate_reply = AsyncMock()
        session.aclose = AsyncMock()
        api = SimpleNamespace(create_transcript_segment=AsyncMock(), aclose=AsyncMock())
        metadata = json.dumps({"voice_mode": "gemini_live", "agent_prompt": "Run our standup."})
        ctx = SimpleNamespace(
            connect=AsyncMock(),
            wait_for_participant=AsyncMock(return_value=SimpleNamespace(identity="meet-bridge-17")),
            room=SimpleNamespace(name="scrum-1-17-job"),
            job=SimpleNamespace(metadata=metadata),
        )

        async def start(**kwargs):
            for role, text in (("user", "I finished the API."), ("assistant", "Any blockers?")):
                callbacks["conversation_item_added"](SimpleNamespace(item=SimpleNamespace(
                    type="message", role=role, text_content=text, interrupted=False,
                )))

        session.start = AsyncMock(side_effect=start)
        with patch.object(scrum_master.AgentSettings, "from_environment", return_value=settings()), \
                patch.object(scrum_master, "build_session", return_value=session), \
                patch.object(scrum_master.HuzlrApiClient, "from_settings", return_value=api), \
                patch.object(scrum_master, "context_tools", return_value=["scoped-project-tool"]), \
                patch.object(scrum_master, "Agent") as agent, \
                patch.object(scrum_master.asyncio, "sleep", side_effect=asyncio.CancelledError):
            await scrum_master.entrypoint(ctx)
        self.assertEqual(agent.call_args.kwargs["tools"], ["scoped-project-tool"])
        self.assertIn("Run our standup.", agent.call_args.kwargs["instructions"])
        writes = api.create_transcript_segment.await_args_list
        self.assertEqual(len(writes), 2)
        self.assertEqual(writes[0].args, (17,))
        self.assertEqual(writes[0].kwargs["speaker_type"], "participant")
        self.assertEqual(writes[1].kwargs["speaker_id"], SCRUM_MASTER_AGENT_NAME)
        self.assertEqual(writes[1].kwargs["text"], "Any blockers?")
        session.aclose.assert_awaited_once()
        api.aclose.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
