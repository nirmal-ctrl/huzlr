"""Real PostgreSQL/Neo4j with a paginated fake Jira Cloud, never production services.

CONTEXT_INTEGRATION_TESTS=1 PYTHONPATH=app .venv/bin/python -m unittest discover -s tests -p test_jira_integration.py -v
"""
import asyncio
import copy
import os
import unittest
from collections import Counter
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import httpx
from cryptography.fernet import Fernet
from fastapi import HTTPException
from sqlalchemy import select, func, delete

import test_context_integration as native
PIDS = native.PIDS
from models.jira import JiraConnection, JiraBinding, JiraSyncRun, JiraSyncTask, JiraSourceObject, JiraSourceVersion, now
from models.user import User
from models.workspace_membership import WorkspaceMembership
from models.team_membership import TeamMembership
from models.context import ContextJob
from services.jira.client import JiraClient, apply_tokens, access_token
from services.jira.sync import queue_run, run_status
from services.jira.access import verify_sources
from services.jira.context import context_tool
from services.jira.context import assert_current_facts
from services.context_graph import jira_candidates, search
from schemas.jira import JiraContextRequest
from api.v1.endpoints import jira as api
import jira_worker


def adf(value):
    return {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": value}]}]}


class Provider:
    """Small server pages expose clients that mistake maxResults for completion."""
    def __init__(self):
        self.calls = Counter()
        self.denied = set()
        self.inventory = ["101", "102", "103"]
        self.space = {"id": "100", "key": "TEST", "name": "Jira space", "projectTypeKey": "software"}
        self.issues = {str(101 + i): {"id": str(101 + i), "key": f"TEST-{i + 1}", "fields": {
            "project": self.space, "summary": f"migration work {i + 1}", "description": adf("source evidence " * 800),
            "status": {"name": "In Progress" if i == 0 else "Done"}, "issuetype": {"name": "Task"},
            "assignee": {"accountId": "alice", "displayName": "Alice"}, "updated": "2026-10-10T10:00:00.000+0000",
            "issuelinks": [], "attachment": [], "customfield_100": "full custom evidence",
            "comment": {"comments": [{"id": "restricted", "body": adf("must not be imported")} ]},
        }} for i in range(3)}
        self.issues["101"]["fields"]["issuelinks"] = [{"type": {"outward": "blocks", "inward": "is blocked by"}, "outwardIssue": {"id": "102"}}]
        self.issues["102"]["fields"]["issuelinks"] = [{"type": {"outward": "blocks", "inward": "is blocked by"}, "inwardIssue": {"id": "101"}}]
        self.children = {}
        for sid in self.issues:
            for kind in ["comment", "changelog", "worklog"]:
                self.children[(sid, kind)] = [{"id": str(int(sid) * 100 + i), "created": now().isoformat(),
                    "updated": "2026-10-10T10:00:00.000+0000", "body": adf(f"migration comment {i}"),
                    "comment": adf(f"migration worklog {i}"), "timeSpent": "1h", "author": {"displayName": "Alice"},
                    "items": [{"field": "status", "fromString": "Backlog", "toString": "Done"}]} for i in range(5)]

    def response(self, request, value, status=200):
        return httpx.Response(status, json=copy.deepcopy(value), request=request)

    def page(self, request, values, key="values"):
        start = int(request.url.params.get("startAt", "0"))
        return self.response(request, {key: values[start:start + 2], "startAt": start, "maxResults": 2, "total": len(values)})

    async def handle(self, request):
        import json
        path = request.url.path.removeprefix("/ex/jira/cloud")
        self.calls[(path, str(request.url.params))] += 1
        if path == "/oauth/token/accessible-resources":
            return self.response(request, [{"id": "cloud", "name": "Test site", "url": "https://test.atlassian.net", "scopes": ["read:jira-work"]}])
        if path == "/rest/api/3/myself":
            return self.response(request, {"accountId": "alice", "timeZone": "Asia/Kolkata"})
        if path == "/rest/api/3/search/jql":
            payload = json.loads(request.content)
            start = int(payload.get("nextPageToken", "0"))
            issues = [self.issues[i] for i in self.inventory if i not in self.denied]
            rows = copy.deepcopy(issues[start:start + 2])
            if payload["fields"] != ["*all"]:
                for row in rows:
                    row["fields"] = {k: v for k, v in row["fields"].items() if k in payload["fields"]}
            return self.response(request, {"issues": rows, "isLast": start + 2 >= len(issues),
                **({"nextPageToken": str(start + 2)} if start + 2 < len(issues) else {})})
        if path == "/rest/api/3/jql/match":
            return self.response(request, {"matches": [{"matchedIssues": [int(i) for i in self.inventory]}]})
        if path == "/rest/api/3/project/search":
            return self.page(request, [self.space])
        if path == "/rest/api/3/project/100":
            return self.response(request, self.space)
        if path in {"/rest/api/3/project/100/component", "/rest/api/3/project/100/version", "/rest/agile/1.0/board"}:
            return self.page(request, [])
        if path == "/rest/api/3/field":
            return self.response(request, [{"id": "customfield_100", "name": "Acceptance criteria"}])
        parts = path.split("/")
        if len(parts) >= 6 and parts[4] == "issue":
            sid = parts[5]
            if sid.startswith("TEST-"):
                sid = str(100 + int(sid.split("-")[1]))
            if sid in self.denied or sid not in self.issues:
                return self.response(request, {}, 403)
            if len(parts) == 6:
                return self.response(request, self.issues[sid])
            kind = parts[6]
            if kind == "remotelink":
                return self.response(request, [])
            if len(parts) == 8:
                row = next((v for v in self.children[(sid, kind)] if v["id"] == parts[7]), None)
                return self.response(request, row or {}, 200 if row else 404)
            return self.page(request, self.children[(sid, kind)], {"comment": "comments", "changelog": "values", "worklog": "worklogs"}[kind])
        raise AssertionError(f"Unexpected source request: {request.method} {path}")


@unittest.skipUnless(os.getenv("CONTEXT_INTEGRATION_TESTS") == "1", "Opt in to isolated PostgreSQL/Neo4j")
class JiraIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await native.GraphIntegrationTests.asyncSetUp(self)
        self.provider = Provider()
        transport = httpx.MockTransport(self.provider.handle)
        class MockClient(JiraClient):
            def __init__(self, token, cloud_id=None):
                super().__init__(token, cloud_id, transport=transport)
        self.patches = [patch("core.security_utils.ENCRYPTION_KEY", Fernet.generate_key()),
            patch("jira_worker.AsyncSessionLocal", self.sessions), patch("jira_worker.JiraClient", MockClient),
            patch("services.jira.access.JiraClient", MockClient), patch("api.v1.endpoints.jira.JiraClient", MockClient),
            patch.multiple("core.config.settings", JIRA_CLIENT_ID="test-client", JIRA_CLIENT_SECRET="test-secret")]
        for item in self.patches:
            item.start()
        async with self.sessions() as db:
            db.add(User(id=2, username="second-user", email="second@example.test", has_access=True))
            await db.flush()
            db.add(WorkspaceMembership(user_id=2, workspace_id=1))
            db.add(TeamMembership(user_id=2, team_id=1))
            connection = JiraConnection(user_id=1, account_id="alice", sites=[])
            apply_tokens(connection, {"access_token": "first-token", "refresh_token": "first-refresh", "expires_in": 3600})
            db.add(connection)
            await db.flush()
            self.connection_id = connection.id
            binding = JiraBinding(connection_id=connection.id, user_id=1, project_id=PIDS[0], workspace_id=1,
                cloud_id="cloud", site_url="https://test.atlassian.net", jira_project_id="100", project_key="TEST", name="Jira space")
            db.add(binding)
            await db.flush()
            self.binding_id = binding.id
            await queue_run(db, binding, full=True)
            await db.commit()

    async def asyncTearDown(self):
        for item in reversed(self.patches):
            item.stop()
        await native.GraphIntegrationTests.asyncTearDown(self)

    async def drain(self):
        for _ in range(150):
            claim = await jira_worker.claim_task()
            if not claim:
                return
            await jira_worker.process(claim)
        self.fail("Worker did not drain durable task queue")

    async def project_graph(self, pid=PIDS[0]):
        return await native.GraphIntegrationTests.project_graph(self, pid)

    async def query(self, user_id=1):
        async with self.sessions() as db:
            ids, _ = await jira_candidates(self.driver, 1, [PIDS[0]], user_id, "migration", limit=80)
            allowed = await verify_sources(db, user_id, [PIDS[0]], ids)
        return await search(self.driver, 1, [PIDS[0]], "migration", [], 100, jira_ids=allowed)

    async def test_complete_import_replay_graph_and_personal_access(self):
        await self.drain()
        async with self.sessions() as db:
            binding = await db.get(JiraBinding, self.binding_id)
            state = await run_status(db, binding)
            self.assertEqual(state["run"]["status"], "complete", state)
            rows = list((await db.scalars(select(JiraSourceObject))).all())
            counts = Counter(r.kind for r in rows)
            self.assertEqual(counts["issue"], 3)
            self.assertEqual(counts["comment"], 15)
            self.assertEqual(counts["change"], 15)
            self.assertEqual(counts["worklog"], 15)
            self.assertFalse(any("must not be imported" in str(r.payload) for r in rows))
            original_count = len(rows)
            versions = await db.scalar(select(func.count()).select_from(JiraSourceVersion))
            await queue_run(db, binding, full=True)
            await db.commit()
        await self.drain()
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(JiraSourceObject)), original_count)
            self.assertEqual(await db.scalar(select(func.count()).select_from(JiraSourceVersion)), versions)
            job = await db.get(ContextJob, PIDS[0])
            self.assertGreater(job.revision, 20)
        await self.project_graph()
        result = await self.query()
        self.assertTrue(any(f.get("source_system") == "jira" for f in result["facts"]))
        self.assertTrue(any(e["kind"] == "BLOCKS" for e in result["relationships"]))
        other_user = await self.query(2)
        self.assertFalse(any(f.get("source_system") == "jira" for f in other_user["facts"]))
        default = await search(self.driver, 1, [PIDS[0]], "migration", [], 100)
        self.assertFalse(any(f.get("source_system") == "jira" for f in default["facts"]))

    async def test_live_revocation_and_version_changes_suppress_cached_evidence(self):
        await self.drain()
        await self.project_graph()
        self.provider.denied.add("101")
        result = await self.query()
        self.assertFalse(any(":issue:101" in f["canonical_id"] or ":comment:101" in f["canonical_id"] for f in result["facts"]))
        self.assertFalse(any(e["kind"] == "BLOCKS" for e in result["relationships"]))
        self.provider.denied.clear()
        self.provider.issues["101"]["fields"]["summary"] = "edited source"
        result = await self.query()
        self.assertFalse(any(":issue:101" in f["canonical_id"] for f in result["facts"]))
        async with self.sessions() as db:
            binding = await db.get(JiraBinding, self.binding_id)
            await queue_run(db, binding, full=True)
            await db.commit()
        await self.drain()
        # SQL already contains the new version, but Neo4j still has the old one.
        result = await self.query()
        self.assertFalse(any(":issue:101" in f["canonical_id"] for f in result["facts"]))
        async with self.sessions() as db:
            row = await db.scalar(select(JiraSourceObject).where(JiraSourceObject.kind == "issue", JiraSourceObject.source_id == "101"))
            self.assertEqual(await db.scalar(select(func.count()).select_from(JiraSourceVersion).where(JiraSourceVersion.object_id == row.id)), 2)

    async def test_reconciliation_deletes_missing_children_and_issue_scope(self):
        await self.drain()
        self.provider.children[("101", "comment")] = self.provider.children[("101", "comment")][1:]
        self.provider.inventory.remove("103")
        async with self.sessions() as db:
            await queue_run(db, await db.get(JiraBinding, self.binding_id), full=True)
            await db.commit()
        await self.drain()
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(JiraSourceObject.state).where(JiraSourceObject.kind == "comment", JiraSourceObject.source_id == "10100")), "unavailable")
            missing = (await db.scalars(select(JiraSourceObject).where(
                (JiraSourceObject.issue_id == "103") | ((JiraSourceObject.kind == "issue") & (JiraSourceObject.source_id == "103"))))).all()
            self.assertTrue(missing)
            self.assertTrue(all(r.state == "unavailable" for r in missing))

    async def test_worker_checkpoint_and_lease_fencing(self):
        async with self.sessions() as db:
            task = await db.scalar(select(JiraSyncTask).where(JiraSyncTask.dataset == "issues"))
            task.lease_token, task.status, task.lease_until = str(uuid4()), "running", now() + timedelta(minutes=1)
            task_id = task.id
            await db.commit()
        await jira_worker.process({"id": task_id, "token": str(uuid4())})
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(JiraSourceObject)), 0)
            task = await db.get(JiraSyncTask, task_id)
            self.assertEqual(task.cursor, {})
            task.lease_until = now() - timedelta(seconds=1)
            await db.commit()
        claim = await jira_worker.claim_task()
        with patch("jira_worker.persist_batch", AsyncMock(side_effect=RuntimeError("simulated persistence failure"))):
            await jira_worker.process(claim)
        async with self.sessions() as db:
            task = await db.get(JiraSyncTask, claim["id"])
            self.assertEqual(task.cursor, {})
            self.assertEqual(task.records, 0)
            task.available_at = now() - timedelta(seconds=1)
            await db.commit()
        await self.drain()
        async with self.sessions() as db:
            self.assertEqual((await run_status(db, await db.get(JiraBinding, self.binding_id)))["run"]["status"], "complete")

    async def test_overview_complete_counts_paged_evidence_and_dependencies(self):
        await self.drain()
        session = SimpleNamespace(id=str(uuid4()), user_id=1, workspace_id=1, project_ids=[PIDS[0]])
        async with self.sessions() as db:
            base = {"session_id": session.id, "project_id": PIDS[0]}
            overview = await context_tool(db, session, JiraContextRequest(**base))
            import json
            counts = json.loads(overview["facts"][0]["text"])
            self.assertEqual(counts["visible_work_items"], 3)
            self.assertEqual(counts["status_counts"], {"In Progress": 1, "Done": 2})
            evidence = await context_tool(db, session, JiraContextRequest(**base, operation="evidence", issue="TEST-1", cursor=2, limit=2))
            self.assertEqual(len(evidence["facts"]), 2)
            self.assertEqual(evidence["next_cursor"], 4)
            deps = await context_tool(db, session, JiraContextRequest(**base, operation="dependencies", issue="TEST-1"))
            self.assertEqual(len(deps["facts"]), 2)
            self.assertEqual({e["kind"] for e in deps["relationships"]}, {"BLOCKS"})
            await assert_current_facts(db, session, overview["facts"])
            self.provider.denied.add("101")
            with self.assertRaises(HTTPException) as error:
                await assert_current_facts(db, session, overview["facts"])
            self.assertEqual(error.exception.status_code, 409)

    async def test_incremental_rescans_child_edits_without_issue_update(self):
        await self.drain()
        self.provider.children[("101", "comment")][0]["body"] = adf("a changed comment")
        # Simulate an issue search watermark returning no changed issues.
        self.provider.inventory = []
        async with self.sessions() as db:
            run = await queue_run(db, await db.get(JiraBinding, self.binding_id))
            self.assertEqual(run.mode, "incremental")
            await db.commit()
        await self.drain()
        async with self.sessions() as db:
            row = await db.scalar(select(JiraSourceObject).where(JiraSourceObject.kind == "comment", JiraSourceObject.source_id == "10100"))
            self.assertIn("a changed comment", str(row.payload))
            self.assertEqual(await db.scalar(select(func.count()).select_from(JiraSourceVersion).where(JiraSourceVersion.object_id == row.id)), 2)

    async def test_text_attachment_ingestion_and_restricted_comment_attachment_revocation(self):
        self.provider.issues["101"]["fields"]["attachment"] = [{"id": "42", "filename": "decision.txt", "mimeType": "text/plain", "size": 15}]
        previous = self.provider.handle
        revoked = False
        async def handler(request):
            if request.url.path.endswith("/attachment/42"):
                return httpx.Response(403 if revoked else 200, json={"id": "42"})
            if request.url.path.endswith("/attachment/content/42"):
                return httpx.Response(200, content=b"migration decision")
            return await previous(request)
        self.provider.handle = handler
        # MockTransport captured the original bound method, so replace clients for this fixture.
        transport = httpx.MockTransport(handler)
        class MockClient(JiraClient):
            def __init__(self, token, cloud_id=None):
                super().__init__(token, cloud_id, transport=transport)
        with patch("jira_worker.JiraClient", MockClient), patch("services.jira.access.JiraClient", MockClient):
            await self.drain()
            async with self.sessions() as db:
                row = await db.scalar(select(JiraSourceObject).where(JiraSourceObject.kind == "attachment_content"))
                self.assertEqual(row.payload["content"], "migration decision")
                self.assertTrue(await verify_sources(db, 1, [PIDS[0]], [row.id]))
                revoked = True
                self.assertEqual(await verify_sources(db, 1, [PIDS[0]], [row.id]), [])

    async def test_webhook_hint_coalesces_and_never_imports_payload_fields(self):
        from services.jira.webhooks import hint
        async with self.sessions() as db:
            binding = await db.get(JiraBinding, self.binding_id)
            binding.webhook_id = "500"
            binding.next_sync_at = now() + timedelta(hours=1)
            binding.reconciled_at = now()
            await db.commit()
            payload = {"matchedWebhookIds": [500], "webhookEvent": "jira:issue_deleted", "issue": {"description": "untrusted webhook content"}}
            await hint(db, binding.id, payload)
            await hint(db, binding.id, payload)
            await db.commit()
            self.assertLessEqual(binding.next_sync_at, now())
            self.assertIsNone(binding.reconciled_at)
            self.assertEqual(await db.scalar(select(func.count()).select_from(JiraSourceObject)), 0)
            with self.assertRaises(HTTPException):
                await hint(db, binding.id, {**payload, "matchedWebhookIds": [999]})

    async def test_oauth_single_use_user_bound_state_and_serial_token_rotation(self):
        async with self.sessions() as db:
            url = (await api.authorize_jira(SimpleNamespace(id=1), db))["authorization_url"]
            state = parse_qs(urlparse(url).query)["state"][0]
            self.assertGreater(len(state), 30)
            exchange = AsyncMock(return_value={"access_token": "second-token", "refresh_token": "second-refresh", "expires_in": 3600})
            with patch("api.v1.endpoints.jira.token_request", exchange):
                with self.assertRaises(HTTPException):
                    await api.jira_callback("code", state, SimpleNamespace(id=2), db)
                exchange.assert_not_awaited()
                await api.jira_callback("code", state, SimpleNamespace(id=1), db)
                with self.assertRaises(HTTPException):
                    await api.jira_callback("code", state, SimpleNamespace(id=1), db)
                exchange.assert_awaited_once()
            connection = await db.get(JiraConnection, self.connection_id)
            connection.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1)
            await db.commit()
        async def refresh(*args):
            await asyncio.sleep(.05)
            return {"access_token": "rotated-token", "refresh_token": "rotated-refresh", "expires_in": 3600}
        exchange = AsyncMock(side_effect=refresh)
        async def get_token():
            async with self.sessions() as db:
                return await access_token(db, self.connection_id)
        with patch("services.jira.client.token_request", exchange):
            self.assertEqual(await asyncio.gather(get_token(), get_token()), ["rotated-token", "rotated-token"])
            exchange.assert_awaited_once()

    async def test_disconnect_purges_sources_and_immediately_hides_graph(self):
        await self.drain()
        await self.project_graph()
        async with self.sessions() as db:
            with self.assertRaises(HTTPException) as error:
                await api.remove_binding(self.binding_id, SimpleNamespace(id=2), db)
            self.assertEqual(error.exception.status_code, 404)
            await api.remove_binding(self.binding_id, SimpleNamespace(id=1), db)
            self.assertEqual(await db.scalar(select(func.count()).select_from(JiraSourceObject)), 0)
            self.assertEqual(await db.scalar(select(func.count()).select_from(JiraSourceVersion)), 0)
        self.assertFalse(any(f.get("source_system") == "jira" for f in (await self.query())["facts"]))


if __name__ == "__main__":
    unittest.main()
