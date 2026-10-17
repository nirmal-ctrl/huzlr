import json
import unittest
from types import SimpleNamespace
import httpx
from services.jira.adf import adf_text
from services.jira.client import JiraClient, JiraError, offset_page, source_jql
from services.jira.projector import project_binding
from services.jira.sync import normalize_issue
from schemas.jira import BindingCreate
from pydantic import ValidationError
from unittest.mock import patch
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi import HTTPException
from services.jira.webhooks import verify_bearer
from services.jira.attachments import extract_attachment


class JiraUnitTests(unittest.TestCase):
    def test_adf_preserves_lists_mentions_links_and_tables(self):
        value = {"type": "doc", "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "Release", "marks": [{"type": "link", "attrs": {"href": "https://example.test"}}]},
                {"type": "mention", "attrs": {"id": "u1", "text": "@Ada"}}]},
            {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Migrate"}]}]}]},
            {"type": "table", "content": [{"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "text", "text": "Owner"}]}]}]},
        ]}
        result = adf_text(value)
        self.assertIn("https://example.test", result)
        self.assertIn("@Ada", result)
        self.assertIn("- Migrate", result)
        self.assertIn("Owner |", result)

    def test_embedded_restricted_previews_are_separate_sources(self):
        value = normalize_issue({"id": "1", "key": "T-1", "fields": {"summary": "Work", "comment": {"comments": [{"body": "Secret"}]},
            "worklog": {"worklogs": []}, "customfield_1": {"unknown": "retained"}}})
        self.assertNotIn("comment", value["fields"])
        self.assertNotIn("worklog", value["fields"])
        self.assertEqual(value["fields"]["customfield_1"], {"unknown": "retained"})

    def test_pagination_handles_short_server_pages_and_rejects_false_completion(self):
        self.assertEqual(offset_page({"values": [1, 2], "total": 5}, "values", 0), ([1, 2], 2))
        self.assertEqual(offset_page({"values": [5], "total": 5}, "values", 4), ([5], None))
        with self.assertRaises(JiraError):
            offset_page({"values": [], "isLast": False}, "values", 0)

    def test_source_selector_cannot_escape_project(self):
        self.assertEqual(source_jql(SimpleNamespace(jira_project_id="100", filter_id=7)), "project = 100 AND filter = 7")
        with self.assertRaises(ValidationError):
            BindingCreate(project_id=1, cloud_id="../evil", jira_project_id="100")
        with self.assertRaises(ValidationError):
            BindingCreate(project_id=1, cloud_id="cloud", jira_project_id="100 OR project=200")

    def test_projection_preserves_direction_and_distinguishes_destination_bindings(self):
        binding = SimpleNamespace(id="binding-a", project_id=10, workspace_id=1, user_id=2, site_url="https://test.atlassian.net", project_key="T")
        rows = [SimpleNamespace(id=f"object-{i}", kind="issue", source_id=str(i), issue_id=None, version="v", source_updated_at="",
            payload={"id": str(i), "key": f"T-{i}", "fields": {"summary": "Work", "project": {"id": "100"},
                "issuelinks": [{"type": {"inward": "is blocked by"}, "inwardIssue": {"id": "2"}}] if i == 1 else []}}) for i in [1, 2]]
        nodes, edges, artifacts = project_binding(binding, rows)
        blocking = next(e for e in edges if e["kind"] == "BLOCKS")
        self.assertTrue(blocking["source"].endswith("issue:2"))
        self.assertTrue(blocking["target"].endswith("issue:1"))
        self.assertTrue(all(n["jira_owner_id"] == 2 for n in nodes))
        self.assertTrue(artifacts)
        old = {n["canonical_id"] for n in nodes}
        binding.id = "binding-b"
        self.assertFalse(old & {n["canonical_id"] for n in project_binding(binding, rows)[0]})


class JiraClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_attachment_download_rejects_redirects_and_oversized_bodies(self):
        transport = httpx.MockTransport(lambda request: httpx.Response(303, headers={"Location": "https://evil.test"}))
        async with JiraClient("fake", "cloud", transport) as client:
            with self.assertRaises(JiraError):
                await client.attachment_bytes("42")
        transport = httpx.MockTransport(lambda request: httpx.Response(200, content=b"x" * 20))
        with patch("services.jira.client.settings.JIRA_MAX_ATTACHMENT_BYTES", 10):
            async with JiraClient("fake", "cloud", transport) as client:
                with self.assertRaises(JiraError) as error:
                    await client.attachment_bytes("42")
                self.assertEqual(error.exception.category, "attachment_too_large")

    async def test_text_attachment_extraction_and_unsupported_format_coverage(self):
        transport = httpx.MockTransport(lambda request: httpx.Response(200, content=b"<p>Decision</p><script>ignore</script>"))
        async with JiraClient("fake", "cloud", transport) as client:
            result = await extract_attachment(client, {"id": "42", "mimeType": "text/html", "size": 40})
            self.assertEqual(result["content"], "Decision")
            result = await extract_attachment(client, {"id": "43", "mimeType": "application/pdf", "size": 40})
            self.assertEqual(result["coverage"], "unsupported_format")

    async def test_webhook_authentication_requires_signed_expiring_bearer(self):
        with patch.multiple("services.jira.webhooks.settings", JIRA_WEBHOOKS_ENABLED=True, JIRA_CLIENT_SECRET="test-secret"):
            valid = jwt.encode({"exp": datetime.now(timezone.utc) + timedelta(minutes=1)}, "test-secret", algorithm="HS256")
            verify_bearer("Bearer " + valid)
            for token in ["Bearer " + jwt.encode({}, "test-secret", algorithm="HS256"),
                "Bearer " + jwt.encode({"exp": 1}, "test-secret", algorithm="HS256"),
                "Bearer " + jwt.encode({"exp": 9999999999}, "wrong-secret", algorithm="HS256"), None]:
                with self.assertRaises(HTTPException):
                    verify_bearer(token)

    async def test_read_client_rejects_writes_and_arbitrary_origins(self):
        async with JiraClient("fake", "cloud") as client:
            with self.assertRaises(ValueError):
                await client.post("/rest/api/3/issue", json={})
            with self.assertRaises(ValueError):
                await client.get("https://evil.test/steal")

    async def test_provider_error_never_contains_token_or_body(self):
        transport = httpx.MockTransport(lambda request: httpx.Response(403, text="SECRET TOKEN"))
        async with JiraClient("private-token", "cloud", transport) as client:
            with self.assertRaises(JiraError) as error:
                await client.get("/rest/api/3/project/1")
        self.assertEqual(str(error.exception), "access_denied")

    async def test_long_rate_limit_is_deferred_without_blocking_worker(self):
        transport = httpx.MockTransport(lambda request: httpx.Response(429, headers={"Retry-After": "600"}))
        async with JiraClient("fake", "cloud", transport) as client:
            with self.assertRaises(JiraError) as error:
                await client.get("/rest/api/3/project/1")
        self.assertEqual(error.exception.retry_after, 600)

    async def test_all_comment_pages_are_consumed_despite_server_cap(self):
        def handler(request):
            start = int(request.url.params["startAt"])
            return httpx.Response(200, json={"comments": [{"id": i} for i in range(start, min(start + 2, 5))], "total": 5})
        async with JiraClient("fake", "cloud", httpx.MockTransport(handler)) as client:
            pages = [p async for p in client.pages("/rest/api/3/issue/1/comment", key="comments")]
        self.assertEqual([v["id"] for page in pages for v in page], list(range(5)))


if __name__ == "__main__":
    unittest.main()
