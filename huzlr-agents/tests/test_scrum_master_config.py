import json
import unittest

from huzlr_agents.contracts import (
    DEFAULT_SCRUM_MASTER_AGENT_PROMPT,
    DEFAULT_SCRUM_MASTER_INTRODUCTION,
    ScrumMasterConversationConfig,
)


class ScrumMasterConversationConfigTests(unittest.TestCase):
    def test_reads_workspace_conversation_settings_from_dispatch_metadata(self):
        config = ScrumMasterConversationConfig.from_metadata(
            json.dumps(
                {
                    "agent_prompt": "  Facilitate this meeting in French.  ",
                    "introduction_message": "  Bonjour, je suis Nim.  ",
                }
            )
        )

        self.assertEqual(config.agent_prompt, "Facilitate this meeting in French.")
        self.assertEqual(config.introduction_message, "Bonjour, je suis Nim.")

    def test_invalid_metadata_uses_existing_agent_defaults(self):
        config = ScrumMasterConversationConfig.from_metadata("not-json")

        self.assertEqual(config.agent_prompt, DEFAULT_SCRUM_MASTER_AGENT_PROMPT)
        self.assertEqual(config.introduction_message, DEFAULT_SCRUM_MASTER_INTRODUCTION)
        self.assertEqual(config.voice_mode, "pipeline")

    def test_selects_native_audio_from_dispatch_metadata(self):
        config = ScrumMasterConversationConfig.from_metadata('{"voice_mode": "gemini_live"}')
        self.assertEqual(config.voice_mode, "gemini_live")

    def test_missing_voice_mode_preserves_existing_pipeline(self):
        self.assertEqual(ScrumMasterConversationConfig.from_metadata("{}").voice_mode, "pipeline")

    def test_invalid_voice_modes_fail_instead_of_switching_providers(self):
        for mode in ("fish_audio", "", None, [], {}):
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                ScrumMasterConversationConfig.from_metadata(json.dumps({"voice_mode": mode}))


if __name__ == "__main__":
    unittest.main()
