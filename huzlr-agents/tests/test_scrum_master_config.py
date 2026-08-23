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


if __name__ == "__main__":
    unittest.main()
