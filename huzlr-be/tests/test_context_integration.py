"""Real PostgreSQL + Neo4j integration tests, explicitly enabled for isolated services.

CONTEXT_INTEGRATION_TESTS=1 PYTHONPATH=app .venv/bin/python -m unittest discover -s tests -p test_context_integration.py -v
Uses only ports from compose.context-test.yml, never DATABASE_URL from .env.
"""
import importlib.util
import os
from pathlib import Path
import unittest
import logging
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch
from unittest.mock import AsyncMock

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import HTTPException
from sqlalchemy import select, text, func, delete
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from models.base import Base
from models.user import User
from models.workspace import Workspace
from models.team import Team
from models.workspace_membership import WorkspaceMembership, WorkspaceRoleEnum
from models.team_membership import TeamMembership
from models.project import Project
from models.issue import Issue, IssueDependency
from models.project_document import ProjectDocument
from models.context import ContextJob, ContextEvent, ContextSession, ContextAction, ContextNote, ContextClaim
from services.context_graph import initialize, project_graph, replace_projection, search
from services.context_snapshot import snapshot
from services.context_access import session_for_user
from api.v1.endpoints.context import confirm_action
from context_worker import claim_job, process
from schemas.context import ClaimCandidate

PG_URL = "postgresql+asyncpg://context_test:context_test_only@127.0.0.1:55439/context_test"
logging.getLogger("neo4j.notifications").setLevel(logging.ERROR)
PIDS = [810001, 810002, 810003]


@unittest.skipUnless(os.getenv("CONTEXT_INTEGRATION_TESTS") == "1", "Start isolated context test services and opt in")
class GraphIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from neo4j import AsyncGraphDatabase
        self.schema = "context_test_" + uuid4().hex
        self.admin = create_async_engine(PG_URL, poolclass=NullPool)
        async with self.admin.begin() as conn:
            await conn.execute(text(f'CREATE SCHEMA "{self.schema}"'))
        self.engine = create_async_engine(PG_URL, poolclass=NullPool, connect_args={"server_settings": {"search_path": self.schema}})
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)
        async with self.engine.begin() as conn:
            core = [t for t in Base.metadata.sorted_tables if not t.name.startswith(("context_", "jira_")) and t.name != "meeting_projects"]
            core.append(Base.metadata.tables["jira_connections"])
            await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=core))
            for column in ["account_id", "sites", "status"]:
                await conn.execute(text(f"ALTER TABLE jira_connections DROP COLUMN {column}"))
            path = Path(__file__).resolve().parents[1] / "alembic/versions/b2c3d4e5f6a7_context_graphs.py"
            spec = importlib.util.spec_from_file_location("context_migration", path)
            migration = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration)
            def upgrade(c):
                with Operations.context(MigrationContext.configure(c)):
                    migration.upgrade()
            await conn.run_sync(upgrade)
            path = Path(__file__).resolve().parents[1] / "alembic/versions/c3d4e5f6a7b8_jira_context_connector.py"
            spec = importlib.util.spec_from_file_location("jira_migration", path)
            migration = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration)
            await conn.run_sync(upgrade)
        self.driver = AsyncGraphDatabase.driver("bolt://127.0.0.1:57689", auth=("neo4j", "context_test_only"))
        await initialize(self.driver)
        self.flags = patch.multiple("core.config.settings", CONTEXT_ENABLED=True,
                                    CONTEXT_EMBEDDINGS_ENABLED=False, CONTEXT_EXTRACTION_ENABLED=False, NEO4J_DATABASE="neo4j")
        self.flags.start()
        async with self.sessions() as db:
            db.add(User(id=1, username="context-user", email="context@example.test", has_access=True))
            await db.flush()
            db.add_all([Workspace(id=i, name=f"Workspace {i}", owner_id=1, created_by=1) for i in [1, 2]])
            await db.flush()
            db.add_all([Team(id=i, workspace_id=i, name=f"Team {i}") for i in [1, 2]])
            await db.flush()
            db.add(WorkspaceMembership(user_id=1, workspace_id=1, role=WorkspaceRoleEnum.ADMIN))
            db.add(TeamMembership(user_id=1, team_id=1))
            db.add_all([Project(project_id=p, team_id=1 if p != PIDS[2] else 2,
                                properties={"project_title": f"Project {p}"}) for p in PIDS])
            await db.flush()
            db.add_all([Issue(id=100 + i, project_id=p, title="release dependency", description=f"private project {p}") for i, p in enumerate(PIDS)])
            await db.flush()
            db.add(IssueDependency(issue_id=100, depends_on_issue_id=101))
            # Deliberately malformed cross-tenant operational edge must not leak in Neo4j.
            db.add(IssueDependency(issue_id=100, depends_on_issue_id=102))
            db.add(ProjectDocument(document_id=1, project_id=PIDS[0], title="Migration design", content="<p>The release depends on migration approval.</p>"))
            await db.commit()

    async def asyncTearDown(self):
        self.flags.stop()
        async with self.driver.session(database="neo4j") as session:
            await (await session.run("MATCH (n) WHERE n.project_id IN $ids DETACH DELETE n", ids=PIDS)).consume()
        await self.driver.close()
        await self.engine.dispose()
        async with self.admin.begin() as conn:
            await conn.execute(text(f'DROP SCHEMA "{self.schema}" CASCADE'))
        await self.admin.dispose()

    async def project_graph(self, pid):
        async with self.sessions() as db:
            job = await db.get(ContextJob, pid)
            nodes, edges, _ = await snapshot(db, pid, job.workspace_id)
            await replace_projection(self.driver, pid, job.workspace_id, job.revision, nodes, edges)
            return job.revision

    async def test_outbox_rollback_and_document_change(self):
        async with self.sessions() as db:
            initial = await db.scalar(select(func.count()).select_from(ContextEvent))
            doc = await db.get(ProjectDocument, 1)
            doc.content = "rollback must not be delivered"
            await db.flush()
            self.assertGreater(await db.scalar(select(func.count()).select_from(ContextEvent)), initial)
            await db.rollback()
            self.assertEqual(await db.scalar(select(func.count()).select_from(ContextEvent)), initial)

    async def test_graph_replay_cross_project_and_tenant_isolation(self):
        for pid in PIDS:
            await self.project_graph(pid)
        visual = await project_graph(self.driver, 1, PIDS[0])
        self.assertEqual(visual["project_id"], PIDS[0])
        self.assertTrue(any(n["kind"] == "Project" for n in visual["nodes"]))
        self.assertTrue(all(n["project_id"] == PIDS[0] for n in visual["nodes"]))
        self.assertTrue(all(e["source"] != e["target"] for e in visual["relationships"]))
        result = await search(self.driver, 1, PIDS[:2], "release", [], 20)
        self.assertEqual({n["project_id"] for n in result["facts"]}, set(PIDS[:2]))
        self.assertTrue(any(e["kind"] == "DEPENDS_ON" for e in result["relationships"]))
        restricted = await search(self.driver, 1, [PIDS[0]], "release", [], 20)
        self.assertTrue(all(n["project_id"] == PIDS[0] for n in restricted["facts"]))
        self.assertFalse(any(e["kind"] == "DEPENDS_ON" for e in restricted["relationships"]))
        # Rebuilding the dependency target must reconstruct incoming relationships.
        async with self.sessions() as db:
            await db.execute(text("SELECT context_enqueue(:pid, 1, 'test.reindex', '{}'::jsonb)"), {"pid": PIDS[1]})
            await db.commit()
        await self.project_graph(PIDS[1])
        result = await search(self.driver, 1, PIDS[:2], "release", [], 20)
        self.assertTrue(any(e["kind"] == "DEPENDS_ON" for e in result["relationships"]))

    async def test_stale_worker_does_not_replace_newer_graph_and_deletion_tombstone(self):
        revision = await self.project_graph(PIDS[0])
        await replace_projection(self.driver, PIDS[0], 1, revision - 1, [], [])
        self.assertTrue((await search(self.driver, 1, [PIDS[0]], "migration", [], 20))["facts"])
        async with self.sessions() as db:
            # ORM deletion exercises cascades and trigger emission.
            project = await db.get(Project, PIDS[0])
            await db.delete(project)
            await db.commit()
            self.assertIsNotNone(await db.get(ContextJob, PIDS[0]))
        await self.project_graph(PIDS[0])
        self.assertEqual((await search(self.driver, 1, [PIDS[0]], "migration", [], 20))["facts"], [])

    async def test_revocation_and_idempotent_confirmation(self):
        async with self.sessions() as db:
            session = ContextSession(user_id=1, workspace_id=1, project_ids=PIDS[:2],
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1))
            db.add(session)
            await db.flush()
            action = ContextAction(session_id=session.id, project_id=PIDS[0], payload={"title": "Confirmed task", "description": "Evidence"})
            db.add(action)
            await db.commit()
            first = await confirm_action(action.id, db, SimpleNamespace(id=1))
            second = await confirm_action(action.id, db, SimpleNamespace(id=1))
            self.assertEqual(first, second)
            self.assertEqual(await db.scalar(select(func.count()).select_from(Issue).where(Issue.title == "Confirmed task")), 1)
            await db.execute(delete(WorkspaceMembership).where(WorkspaceMembership.user_id == 1))
            await db.commit()
            with self.assertRaises(HTTPException) as error:
                await session_for_user(db, session.id, 1)
            self.assertEqual(error.exception.status_code, 403)

    async def test_worker_lease_retry_and_enrichment_replay(self):
        candidate = ClaimCandidate(predicate="blocker", statement="Migration needs approval",
                                   evidence="migration approval", confidence=.9)
        with patch("context_worker.AsyncSessionLocal", self.sessions):
            first = await claim_job()
            second = await claim_job()
            self.assertNotEqual(first["project_id"], second["project_id"])
            await process(self.driver, first)
            await process(self.driver, second)
            while job := await claim_job():
                if job["phase"] == "enrichment":
                    first = job
                    break
                await process(self.driver, job)
            # Optional provider failure preserves the usable graph and retries enrichment.
            with patch("context_worker.enrich", AsyncMock(side_effect=RuntimeError("provider failed"))):
                await process(self.driver, first)
            async with self.sessions() as db:
                failed = await db.get(ContextJob, first["project_id"])
                self.assertEqual(failed.applied_revision, failed.revision)
                self.assertEqual(failed.enrichment_revision, 0)
                self.assertEqual(failed.enrichment_error, "RuntimeError")
                self.assertIsNone(failed.lease_token)
                failed.enrichment_available_at = datetime.now(timezone.utc) - timedelta(seconds=1)
                await db.commit()
            # Claim work again and generate a proposed claim only from source evidence.
            with patch("services.context_enrichment.extract", AsyncMock(return_value=[candidate])):
                while job := await claim_job():
                    await process(self.driver, job)
            async with self.sessions() as db:
                claims = (await db.scalars(select(ContextClaim))).all()
                self.assertEqual(len(claims), 1)
                self.assertEqual(claims[0].status, "proposed")
                self.assertEqual(claims[0].evidence, "migration approval")
            result = await search(self.driver, 1, [PIDS[0]], "approval", [], 20)
            self.assertTrue(any(n["kind"] == "Claim" and n["status"] == "proposed" for n in result["facts"]))

    async def test_scoped_vector_search_cannot_rank_another_workspace(self):
        async with self.sessions() as db:
            for pid in PIDS:
                job = await db.get(ContextJob, pid)
                nodes, edges, _ = await snapshot(db, pid, job.workspace_id)
                for node in nodes:
                    node["embedding"] = [1.0, 0.1, 0.1]
                    node["embedding_model"] = "test-model"
                await replace_projection(self.driver, pid, job.workspace_id, job.revision, nodes, edges)
        with patch("services.context_graph.settings.CONTEXT_EMBEDDING_MODEL", "test-model"):
            result = await search(self.driver, 1, [PIDS[0]], "unmatchedquery", [1., .1, .1], 20)
        self.assertTrue(result["facts"])
        self.assertTrue(all(f["project_id"] == PIDS[0] and f["workspace_id"] == 1 for f in result["facts"]))

    async def test_graphiti_history_replay_validity_and_forget(self):
        from services.context_graphiti import history
        revision = await self.project_graph(PIDS[0])
        initial = await history(self.driver, 1, [PIDS[0]], [], source_id="huzlr:issue:100")
        self.assertEqual(len(initial["episodes"]), 1)
        cutoff = datetime.fromisoformat(initial["episodes"][0]["recorded_at"])
        async with self.sessions() as db:
            issue = await db.get(Issue, 100)
            issue.description = "Updated after the original observation"
            await db.commit()
        revision = await self.project_graph(PIDS[0])
        current = await history(self.driver, 1, [PIDS[0]], [], source_id="huzlr:issue:100")
        self.assertEqual(len(current["episodes"]), 2)
        self.assertIn("Updated after", current["episodes"][0]["content"]["text"])
        old = await history(self.driver, 1, [PIDS[0]], [], source_id="huzlr:issue:100", as_of=cutoff)
        self.assertEqual(len(old["episodes"]), 1)
        self.assertNotIn("Updated after", old["episodes"][0]["content"]["text"])
        # Same-revision replays cannot create episodes or rewrite the timeline.
        await self.project_graph(PIDS[0])
        self.assertEqual(await history(self.driver, 1, [PIDS[0]], [], source_id="huzlr:issue:100"), current)
        async with self.driver.session(database="neo4j") as graph:
            invalid = await (await graph.run("""MATCH ()-[r:RELATES_TO]->()
                WHERE r.project_id = $pid AND r.invalid_at IS NOT NULL RETURN count(r) AS count""", pid=PIDS[0])).single()
            self.assertGreater(invalid["count"], 0)
        self.assertEqual((await history(self.driver, 2, [PIDS[0]], []))["episodes"], [])
        async with self.sessions() as db:
            await db.delete(await db.get(Issue, 100))
            await db.commit()
        await self.project_graph(PIDS[0])
        self.assertEqual((await history(self.driver, 1, [PIDS[0]], [], source_id="huzlr:issue:100"))["episodes"], [])

    async def test_graphiti_adopts_legacy_nodes_at_same_revision(self):
        async with self.sessions() as db:
            job = await db.get(ContextJob, PIDS[0])
            nodes, edges, _ = await snapshot(db, PIDS[0], 1)
        async with self.driver.session(database="neo4j") as graph:
            await (await graph.run("UNWIND $nodes AS props CREATE (n:ContextEntity) SET n = props", nodes=nodes)).consume()
            await (await graph.run("MERGE (p:ContextPartition {project_id: $pid}) SET p.revision = $revision, p.context_engine = null",
                pid=PIDS[0], revision=job.revision)).consume()
        await replace_projection(self.driver, PIDS[0], 1, job.revision, nodes, edges)
        result = await search(self.driver, 1, [PIDS[0]], "release", [], 20)
        self.assertEqual(result["engine"], "graphiti")
        self.assertTrue(result["temporal_facts"])
        self.assertTrue(all(set(f["source_ids"]).issubset({n["canonical_id"] for n in result["facts"]}) for f in result["temporal_facts"]))

    async def test_graphiti_migration_queues_existing_projects(self):
        async with self.sessions() as db:
            before = {job.project_id: job.revision for job in (await db.scalars(select(ContextJob))).all()}
        path = Path(__file__).resolve().parents[1] / "alembic/versions/e5f6a7b8c9d0_graphiti_context_reindex.py"
        spec = importlib.util.spec_from_file_location("graphiti_migration", path)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        async with self.engine.begin() as conn:
            def upgrade(connection):
                with Operations.context(MigrationContext.configure(connection)):
                    migration.upgrade()
            await conn.run_sync(upgrade)
        async with self.sessions() as db:
            jobs = (await db.scalars(select(ContextJob))).all()
            self.assertEqual(len(jobs), 3)
            self.assertTrue(all(job.revision == before[job.project_id] + 1 and job.revision > job.applied_revision for job in jobs))


if __name__ == "__main__":
    unittest.main()
