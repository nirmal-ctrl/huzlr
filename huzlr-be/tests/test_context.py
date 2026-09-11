import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from jose import jwt
from pydantic import ValidationError

from schemas.context import SessionCreate, Extraction, IssueProposal
from services.context_access import authorize_projects, session_for_user, delegated_session
from services.context_access import enabled
from services.context_text import plain, chunks, digest
from services.context_graph import replace_projection
from services.context_enrichment import extract


class TextTests(unittest.TestCase):
    def test_removes_executable_content_and_preserves_words(self):
        self.assertEqual(plain("<p>First &amp; second</p><script>steal secrets</script><p>Third</p>"), "First & second\n\nThird")

    def test_chunk_offsets_are_exact_and_cover_tail(self):
        text = "a b c " * 1000
        parts = list(chunks(text))
        self.assertEqual(parts[-1]["end"], len(text))
        self.assertTrue(all(text[p["start"]:p["end"]] == p["text"] for p in parts))
        self.assertEqual(parts[1]["start"], parts[0]["end"] - 200)

    def test_empty_text_has_no_chunks(self):
        self.assertEqual(list(chunks("")), [])

    def test_scope_is_bounded_and_deduplicated(self):
        self.assertEqual(SessionCreate(workspace_id=1, project_ids=[2, 1, 2]).project_ids, [1, 2])
        for ids in [[], [-1], list(range(1, 12))]:
            with self.assertRaises(ValidationError):
                SessionCreate(workspace_id=1, project_ids=ids)

    def test_extraction_cannot_supply_cypher_or_active_status(self):
        with self.assertRaises(ValidationError):
            Extraction(claims=[{"predicate": "risk", "statement": "Risk", "evidence": "Risk", "confidence": .9, "status": "active"}])
        with self.assertRaises(ValidationError):
            IssueProposal(project_id=1, title="x" * 201)


class AccessTests(unittest.IsolatedAsyncioTestCase):
    async def test_global_enablement_applies_to_every_workspace(self):
        with patch("services.context_access.settings.CONTEXT_ENABLED", True):
            self.assertTrue(enabled(1))
            self.assertTrue(enabled(999999))

    async def test_team_only_or_partial_project_access_is_denied(self):
        db = SimpleNamespace(scalars=AsyncMock(return_value=SimpleNamespace(all=lambda: [SimpleNamespace(project_id=1)])))
        with patch("services.context_access.enabled", return_value=True):
            with self.assertRaises(HTTPException) as error:
                await authorize_projects(db, 1, 1, [1, 2])
        self.assertEqual(error.exception.status_code, 403)
        query = str(db.scalars.await_args.args[0])
        self.assertIn("workspace_memberships.user_id", query)
        self.assertIn("team_memberships.user_id", query)
        self.assertIn("workspaces.deleted_at IS NULL", query)

    async def test_session_owner_checked_before_project_retrieval(self):
        db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(user_id=2)))
        with self.assertRaises(HTTPException) as error:
            await session_for_user(db, "session", 1)
        self.assertEqual(error.exception.status_code, 404)

    async def test_expired_session_rejected(self):
        db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(user_id=1,
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=1))))
        with self.assertRaises(HTTPException) as error:
            await session_for_user(db, "session", 1)
        self.assertEqual(error.exception.status_code, 410)

    async def test_delegation_wrong_audience_cannot_be_used(self):
        token = jwt.encode({"aud": "wrong", "purpose": "context-read", "uid": 1, "sid": "session",
                            "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, "test-secret", algorithm="HS256")
        with patch("services.context_access.settings.CONTEXT_DELEGATION_SECRET", "test-secret"):
            with self.assertRaises(HTTPException) as error:
                await delegated_session(AsyncMock(), token)
        self.assertEqual(error.exception.status_code, 401)

    async def test_graph_rejects_mutations_outside_partition(self):
        with self.assertRaises(ValueError):
            await replace_projection(None, 1, 1, 1, [{"kind": "Issue", "project_id": 2, "workspace_id": 1}], [])

    async def test_extraction_rejects_hallucinated_evidence(self):
        client = SimpleNamespace(aio=SimpleNamespace(aclose=AsyncMock(), models=SimpleNamespace(generate_content=AsyncMock(
            return_value=SimpleNamespace(text='{"claims":[{"predicate":"risk","statement":"Risk","evidence":"invented","confidence":0.9}]}')))))
        with patch("services.context_enrichment.settings.CONTEXT_EXTRACTION_ENABLED", True), patch("services.context_enrichment.genai.Client", return_value=client):
            with self.assertRaises(ValueError):
                await extract("actual evidence")
        client.aio.aclose.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
