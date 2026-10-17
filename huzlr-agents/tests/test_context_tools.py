import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from huzlr_agents.context import context_tools


class ContextToolsTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_livekit_tools_use_delegated_backend_and_explicit_scope(self):
        requests = []
        def handler(request):
            requests.append(request)
            return httpx.Response(200, json={"facts": [], "next_cursor": 20})
        http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        metadata = json.dumps({"context_session_id": "session", "context_token": "delegation", "context_project_ids": [7]})
        tools = {t.__name__: t for t in context_tools(metadata, "https://api.example.test")}
        self.assertEqual(len(tools), 6)
        try:
            with patch("huzlr_agents.context.httpx.AsyncClient", return_value=http):
                await tools["get_source_evidence"]("T-1", dataset="changelog", cursor=20, text_offset=6000, limit=1)
        finally:
            await http.aclose()
        self.assertEqual(str(requests[0].url), "https://api.example.test/api/v1/context/internal/jira")
        self.assertEqual(requests[0].headers["X-Huzlr-Context-Token"], "delegation")
        body = json.loads(requests[0].content)
        self.assertEqual(body["project_id"], 7)
        self.assertEqual(body["operation"], "evidence")
        self.assertEqual(body["text_offset"], 6000)
        self.assertEqual(body["cursor"], 20)

    async def test_multiple_projects_require_selection_and_bad_metadata_has_no_tools(self):
        metadata = json.dumps({"context_session_id": "session", "context_token": "delegation", "context_project_ids": [7, 8]})
        tools = {t.__name__: t for t in context_tools(metadata, "https://api.example.test")}
        with patch("huzlr_agents.context.httpx.AsyncClient") as client:
            self.assertIn("Select a project", await tools["get_project_overview"]())
            client.assert_not_called()
        for metadata in [None, "[]", "invalid", "{}"]:
            self.assertEqual(context_tools(metadata, "https://api.example.test"), [])


if __name__ == "__main__":
    unittest.main()
