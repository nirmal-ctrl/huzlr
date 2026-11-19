import os
import unittest
from unittest.mock import patch

from worker_runtime.node import NodeConfig, _json_decision


class NodeTests(unittest.TestCase):
    def test_requires_https_outside_localhost(self):
        with patch.dict(os.environ, {
            "HUZLR_CONTROL_PLANE_URL": "http://example.com",
            "HUZLR_NODE_TOKEN": "secret",
        }, clear=True):
            with self.assertRaises(RuntimeError):
                NodeConfig.from_env()

    def test_accepts_local_development_http(self):
        with patch.dict(os.environ, {
            "HUZLR_CONTROL_PLANE_URL": "http://localhost:8001/",
            "HUZLR_NODE_TOKEN": "secret",
        }, clear=True):
            config = NodeConfig.from_env()
            self.assertEqual(config.control_plane_url, "http://localhost:8001")

    def test_rejects_ambiguous_provider_decision(self):
        with self.assertRaises(ValueError):
            _json_decision('{"completed":true,"output":"done","tool_call":{"name":"x","arguments":{}}}')


if __name__ == "__main__":
    unittest.main()
