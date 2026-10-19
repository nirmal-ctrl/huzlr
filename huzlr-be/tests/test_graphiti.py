import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from contextlib import asynccontextmanager
from fastapi import HTTPException

from pydantic import ValidationError
from schemas.context import HistoryRequest
from services.context_graphiti import identifier, namespace, source_payload
from api.v1.endpoints.context import history_packet


class GraphitiContractTests(unittest.TestCase):
    def test_namespaces_and_identifiers_isolate_scope(self):
        self.assertNotEqual(namespace(1, 2), namespace(2, 2))
        self.assertNotEqual(namespace(1, 2), namespace(1, 3))
        self.assertNotEqual(namespace(1, 2), namespace(1, 2, "personal"))
        self.assertNotEqual(namespace(1, 2, "alice"), namespace(1, 2, "bob"))
        self.assertEqual(identifier("episode", 1, 2), identifier("episode", 1, 2))
        self.assertNotEqual(identifier("episode", 1, 2), identifier("episode", 1, 3))

    def test_embedding_changes_do_not_create_source_versions(self):
        self.assertEqual(source_payload({"text": "source", "embedding": [1], "embedding_model": "m"}), {"text": "source"})

    def test_history_requires_timezone_and_bounds(self):
        base = {"session_id": "s" * 36, "project_id": 1}
        self.assertEqual(HistoryRequest(**base, as_of="2026-10-01T00:00:00Z").as_of.tzinfo, timezone.utc)
        for values in ({"as_of": datetime(2026, 10, 1)}, {"cursor": -1}, {"limit": 51}):
            with self.assertRaises(ValidationError):
                HistoryRequest(**base, **values)


class GraphitiAccessTests(unittest.IsolatedAsyncioTestCase):
    async def test_history_rejects_project_or_session_outside_delegation(self):
        session = SimpleNamespace(id="s" * 36, project_ids=[1])
        for payload in (HistoryRequest(session_id="s" * 36, project_id=2), HistoryRequest(session_id="x" * 36, project_id=1)):
            with self.assertRaises(HTTPException) as error:
                await history_packet(None, session, payload)
            self.assertEqual(error.exception.status_code, 403)

    async def test_history_rechecks_revoked_jira_sources_after_read(self):
        @asynccontextmanager
        async def driver():
            yield object()
        session = SimpleNamespace(id="s" * 36, project_ids=[1], user_id=1, workspace_id=1)
        payload = HistoryRequest(session_id=session.id, project_id=1)
        with patch("api.v1.endpoints.context.graph_driver", driver), \
             patch("api.v1.endpoints.context.authorize_projects", AsyncMock()), \
             patch("api.v1.endpoints.context.jira_candidates", AsyncMock(return_value=(["object"], False))), \
             patch("services.jira.access.verify_sources", AsyncMock(side_effect=[["object:version"], []])), \
             patch("services.context_graphiti.history", AsyncMock(return_value={"episodes": []})):
            with self.assertRaises(HTTPException) as error:
                await history_packet(None, session, payload)
        self.assertEqual(error.exception.status_code, 409)

    async def test_shared_delegate_does_not_enumerate_personal_jira_history(self):
        @asynccontextmanager
        async def driver():
            yield object()
        session = SimpleNamespace(id="s" * 36, project_ids=[1], user_id=1, workspace_id=1)
        payload = HistoryRequest(session_id=session.id, project_id=1)
        with patch("api.v1.endpoints.context.graph_driver", driver), \
             patch("api.v1.endpoints.context.authorize_projects", AsyncMock()), \
             patch("api.v1.endpoints.context.jira_candidates", AsyncMock()) as candidates, \
             patch("services.jira.access.verify_sources", AsyncMock(return_value=[])), \
             patch("services.context_graphiti.history", AsyncMock(return_value={"episodes": []})) as read:
            await history_packet(None, session, payload, jira_private=False)
            candidates.assert_not_awaited()
            self.assertEqual(read.await_args.args[3], [])
