import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "huzlr-agents" / "src"))
sys.path.insert(0, str(ROOT / "huzlr-be" / "app"))

from core.voice_agents import (  # noqa: E402
    BRAINSTORM_AGENT_NAME as BACKEND_BRAINSTORM_AGENT_NAME,
    FOUNDER_AGENT_NAME as BACKEND_FOUNDER_AGENT_NAME,
    SCRUM_MASTER_AGENT_NAME as BACKEND_SCRUM_MASTER_AGENT_NAME,
)
from huzlr_agents.contracts import (  # noqa: E402
    BRAINSTORM_AGENT_NAME,
    FOUNDER_AGENT_NAME,
    SCRUM_MASTER_AGENT_NAME,
)
from huzlr_agents.registry import get_worker_options  # noqa: E402


class AgentRegistryTests(unittest.TestCase):
    def test_backend_dispatch_names_match_agent_deployments(self):
        self.assertEqual(BRAINSTORM_AGENT_NAME, BACKEND_BRAINSTORM_AGENT_NAME)
        self.assertEqual(FOUNDER_AGENT_NAME, BACKEND_FOUNDER_AGENT_NAME)
        self.assertEqual(SCRUM_MASTER_AGENT_NAME, BACKEND_SCRUM_MASTER_AGENT_NAME)

    def test_each_agent_type_builds_named_worker_options(self):
        expected = {
            "brainstorm": BRAINSTORM_AGENT_NAME,
            "founder": FOUNDER_AGENT_NAME,
            "scrum_master": SCRUM_MASTER_AGENT_NAME,
        }
        for agent_type, agent_name in expected.items():
            with self.subTest(agent_type=agent_type):
                self.assertEqual(get_worker_options(agent_type).agent_name, agent_name)

    def test_unknown_agent_type_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unsupported HUZLR_AGENT_TYPE"):
            get_worker_options("unknown")


if __name__ == "__main__":
    unittest.main()
