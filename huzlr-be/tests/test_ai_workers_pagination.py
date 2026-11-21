"""Cursor integrity, authorization and stable pagination across workspace projects."""
import base64
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from fastapi import HTTPException
from api.v1.endpoints import ai_workers as api


class CursorTests(unittest.TestCase):
    def test_round_trip_and_scope(self):
        row = SimpleNamespace(id="worker-1", created_at=datetime.now(timezone.utc))
        cursor = api.encode_cursor(row, "workers:1")
        self.assertEqual(api.decode_cursor(cursor, "workers:1"), (row.created_at, row.id))
        with self.assertRaises(HTTPException): api.decode_cursor(cursor, "workers:2")

    def test_invalid_cursors_are_validation_errors(self):
        for cursor in ["!bad!", "a", base64.b64encode(b"null").decode(),
                       base64.b64encode(b'["workers:1","2026-01-01","id"]').decode()]:
            with self.subTest(cursor=cursor), self.assertRaises(HTTPException) as error:
                api.decode_cursor(cursor, "workers:1")
            self.assertEqual(error.exception.status_code, 422)


@unittest.skipUnless(os.getenv("HUZLR_TEST_POSTGRES") == "1", "Set HUZLR_TEST_POSTGRES=1 for isolated PostgreSQL tests")
class PaginationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from core.config import settings
        from sqlalchemy import event, insert, text
        from uuid import uuid4
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        from sqlalchemy.schema import CreateTable
        from models.ai_worker import AIWorker, AIWorkerExecution, AIWorkerEvent
        from models.issue import Issue
        from models.project import Project
        from models.property import Property
        from models.team import Team
        from models.team_membership import TeamMembership
        from models.workspace_membership import WorkspaceMembership
        self.engine = create_async_engine(settings.DATABASE_URL, connect_args={"prepared_statement_cache_size": 0, "statement_cache_size": 0})
        # Poolers can retain plans across clients; keep temporary-table plans local to this test.
        plan_scope = uuid4().hex
        @event.listens_for(self.engine.sync_engine, "before_cursor_execute", retval=True)
        def isolate_plans(connection, cursor, statement, parameters, context, executemany):
            return statement + f" /* pagination-test-{plan_scope} */", parameters
        self.addAsyncCleanup(self.engine.dispose)
        self.connection = await self.engine.connect()
        self.addAsyncCleanup(self.connection.close)
        self.transaction = await self.connection.begin()
        self.addAsyncCleanup(self.transaction.rollback)
        await self.connection.execute(text("SET LOCAL search_path TO pg_temp"))
        for cls in [Team, TeamMembership, WorkspaceMembership, Project, Property, Issue, AIWorker, AIWorkerExecution, AIWorkerEvent]:
            if cls is WorkspaceMembership:
                await self.connection.execute(text("CREATE TYPE pg_temp.workspace_role_enum AS ENUM ('ADMIN', 'USER')"))
            ddl = str(CreateTable(cls.__table__, include_foreign_key_constraints=[]).compile(dialect=self.engine.dialect))
            await self.connection.execute(text(ddl.replace("CREATE TABLE", "CREATE TEMPORARY TABLE")))
        await self.connection.execute(insert(Team), [dict(id=10, name="Accessible", workspace_id=1, deleted_at=None), dict(id=11, name="Private", workspace_id=1, deleted_at=None), dict(id=20, name="Other workspace", workspace_id=2, deleted_at=None), dict(id=30, name="Deleted team", workspace_id=1, deleted_at=datetime.now())])
        await self.connection.execute(insert(WorkspaceMembership), [dict(user_id=1, workspace_id=1), dict(user_id=1, workspace_id=2)])
        await self.connection.execute(insert(TeamMembership), [dict(user_id=1, team_id=10), dict(user_id=1, team_id=20), dict(user_id=1, team_id=30)])
        await self.connection.execute(insert(Project), [dict(project_id=100, team_id=10), dict(project_id=101, team_id=10), dict(project_id=102, team_id=11), dict(project_id=200, team_id=20), dict(project_id=300, team_id=30)])
        await self.connection.execute(insert(Property), [dict(entity_id=100, entity_type="project", data={"project_title":"First project"}), dict(entity_id=101, entity_type="project", data={"project_title":"Second project"})])
        self.timestamp = datetime(2026, 11, 20, tzinfo=timezone.utc)
        self.worker_defaults = dict(created_by=1, name="Worker", instructions="Review tasks", model_provider="test", model_name="stub", deployment_kind="cloud", status="deployed", created_at=self.timestamp)
        rows = [dict(**self.worker_defaults, id=f"w{i:03}", project_id=100 + i % 2) for i in range(65)]
        rows += [dict(**self.worker_defaults, id="private", project_id=102), dict(**self.worker_defaults, id="other", project_id=200), dict(**self.worker_defaults, id="deleted-team", project_id=300)]
        await self.connection.execute(insert(AIWorker), rows)
        await self.connection.execute(insert(AIWorkerExecution), [dict(id=f"e{i:03}", worker_id="w000", requested_by=1, task_description=f"Task {i}", worker_version=1, deployment_kind="cloud", status="completed", created_at=self.timestamp) for i in range(65)])
        self.db = AsyncSession(bind=self.connection, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addAsyncCleanup(self.db.close)
        self.user = SimpleNamespace(id=1)

    async def test_workspace_feed_keeps_ties_stable_and_excludes_inaccessible_projects(self):
        from sqlalchemy import insert
        from models.ai_worker import AIWorker
        first = await api.worker_feed(workspace_id=1, cursor=None, limit=12, db=self.db, user=self.user)
        self.assertEqual(len(first.items), 12)
        self.assertEqual({row.project_name for row in first.items}, {"First project", "Second project"})
        await self.connection.execute(insert(AIWorker), dict(**{**self.worker_defaults, "created_at":self.timestamp + timedelta(seconds=1)}, id="new-worker", project_id=100))
        ids = [row.id for row in first.items]
        cursor = first.next_cursor
        while cursor:
            page = await api.worker_feed(workspace_id=1, cursor=cursor, limit=12, db=self.db, user=self.user)
            ids.extend(row.id for row in page.items)
            cursor = page.next_cursor
        self.assertEqual(len(ids), 65)
        self.assertEqual(set(ids), {f"w{i:03}" for i in range(65)})
        with self.assertRaises(HTTPException) as error:
            await api.worker_feed(workspace_id=2, cursor=first.next_cursor, limit=12, db=self.db, user=self.user)
        self.assertEqual(error.exception.status_code, 422)

    async def test_execution_feed_past_fifty_and_worker_authorization(self):
        ids, cursor = [], None
        while True:
            page = await api.execution_feed(worker_id="w000", cursor=cursor, limit=20, db=self.db, user=self.user)
            ids.extend(row.id for row in page.items)
            cursor = page.next_cursor
            if cursor is None: break
        self.assertEqual(len(ids), 65)
        self.assertEqual(len(set(ids)), 65)
        with self.assertRaises(HTTPException) as error:
            await api.execution_feed(worker_id="private", cursor=None, limit=20, db=self.db, user=self.user)
        self.assertEqual(error.exception.status_code, 403)

    async def test_workspace_creation_without_projects_and_general_execution(self):
        from sqlalchemy import insert
        from models.workspace_membership import WorkspaceMembership
        from services.ai_worker_runtime import claim_cloud_execution, run_execution
        await self.connection.execute(insert(WorkspaceMembership), dict(user_id=1, workspace_id=3))
        worker = await api.create_worker(api.WorkerCreate(workspace_id=3, name="Writer", instructions="Write a short summary",
            model_provider="test", model_name="stub"), self.db, self.user)
        self.assertIsNone(worker.project_id)
        self.assertEqual(worker.workspace_id, 3)
        page = await api.worker_feed(workspace_id=3, cursor=None, limit=12, db=self.db, user=self.user)
        self.assertEqual([item.id for item in page.items], [worker.id])
        self.assertIsNone(page.items[0].project_name)
        await api.deploy_worker(worker.id, self.db, self.user)
        execution = await api.dispatch_execution(worker.id, api.ExecutionCreate(task_description="Write a summary"), self.db, self.user)
        self.assertIsNone(execution.project_id)
        claimed = await claim_cloud_execution(self.db, "workspace-test")
        self.assertEqual(claimed, execution.id)
        await run_execution(self.db, claimed, "workspace-test")
        self.assertEqual(execution.status, "completed", execution.error)

    async def test_workspace_worker_run_scope_and_history_do_not_expose_private_projects(self):
        from sqlalchemy import delete, insert
        from models.ai_worker import AIWorkerExecution
        from models.issue import Issue
        from models.team_membership import TeamMembership
        from services.ai_worker_runtime import execute_tool
        await self.connection.execute(insert(Issue), [dict(id=900, title="Accessible task", project_id=100), dict(id=901, title="Private task", project_id=102)])
        worker = await api.create_worker(api.WorkerCreate(workspace_id=1, name="Reviewer", instructions="Review assigned tasks",
            model_provider="test", model_name="stub", allowed_tools=["get_task"]), self.db, self.user)
        await api.deploy_worker(worker.id, self.db, self.user)
        execution = await api.dispatch_execution(worker.id, api.ExecutionCreate(task_id=900), self.db, self.user)
        self.assertEqual(execution.project_id, 100)
        task = await execute_tool(self.db, worker, "get_task", {"task_id":900}, execution=execution)
        self.assertEqual(task["title"], "Accessible task")
        denied = await execute_tool(self.db, worker, "get_task", {"task_id":901}, execution=execution)
        self.assertIn("error", denied)
        for payload, code in [(api.ExecutionCreate(task_id=901), 403),
                              (api.ExecutionCreate(project_id=200, task_description="Other workspace"), 404),
                              (api.ExecutionCreate(project_id=101, task_id=900), 404)]:
            with self.subTest(payload=payload), self.assertRaises(HTTPException) as error:
                await api.dispatch_execution(worker.id, payload, self.db, self.user)
            self.assertEqual(error.exception.status_code, code)
        await self.connection.execute(insert(AIWorkerExecution), dict(id="hidden-run", worker_id=worker.id, project_id=102,
            requested_by=2, task_description="Private task", worker_version=1, deployment_kind="cloud", status="completed"))
        history = await api.execution_feed(worker.id, cursor=None, limit=20, db=self.db, user=self.user)
        self.assertEqual([item.id for item in history.items], [execution.id])
        with self.assertRaises(HTTPException):
            await api.authorized_execution(worker.id, "hidden-run", self.db, self.user)
        await self.connection.execute(delete(TeamMembership).where(TeamMembership.team_id == 10, TeamMembership.user_id == 1))
        with self.assertRaises(PermissionError):
            await execute_tool(self.db, worker, "get_task", {"task_id":900}, execution=execution)
        with self.assertRaises(HTTPException):
            await api.authorized_execution(worker.id, execution.id, self.db, self.user)
        with self.assertRaises(HTTPException) as error:
            await api.worker_feed(workspace_id=99, cursor=None, limit=12, db=self.db, user=self.user)
        self.assertEqual(error.exception.status_code, 403)


if __name__ == "__main__": unittest.main()
