import sys
import unittest
from pathlib import Path

import httpx


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "huzlr-agents" / "src"))

from huzlr_agents.clients.huzlr_api import HuzlrApiClient, HuzlrApiError  # noqa: E402


class HuzlrApiClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_sends_service_key_and_user_scoped_path(self):
        received = {}

        def handler(request: httpx.Request) -> httpx.Response:
            received["path"] = request.url.path
            received["key"] = request.headers.get("X-Huzlr-Agent-Key")
            return httpx.Response(200, json=[{"id": 4, "title": "Launch", "path": "/projects/4"}])

        http_client = httpx.AsyncClient(
            base_url="https://api.example.com",
            transport=httpx.MockTransport(handler),
        )
        client = HuzlrApiClient("https://api.example.com", "service-secret", client=http_client)
        try:
            projects = await client.list_user_projects(42)
        finally:
            await http_client.aclose()

        self.assertEqual(projects[0]["title"], "Launch")
        self.assertEqual(received["path"], "/api/v1/internal/agents/users/42/projects")
        self.assertEqual(received["key"], "service-secret")

    async def test_http_errors_are_wrapped(self):
        http_client = httpx.AsyncClient(
            base_url="https://api.example.com",
            transport=httpx.MockTransport(lambda _: httpx.Response(401, json={"detail": "Invalid"})),
        )
        client = HuzlrApiClient("https://api.example.com", "bad-key", client=http_client)
        try:
            with self.assertRaises(HuzlrApiError):
                await client.list_user_teams(42)
        finally:
            await http_client.aclose()


if __name__ == "__main__":
    unittest.main()
