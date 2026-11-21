"""Runtime safety regressions plus opt-in real Docker lifecycle tests."""
import asyncio
import base64
import json
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from api.v1.endpoints.ai_workers import WorkerCreate
from core.config import settings
from models.ai_worker import AIWorker, AIWorkerExecution, AIWorkerApproval
from services import ai_worker_runtime as runtime
from services.ai_worker_sandbox import DockerSandbox, docker, reap_sandboxes, sandbox_available


class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_sandbox_capability_checks_the_docker_daemon(self):
        with patch.object(settings, "AI_WORKER_SANDBOX_ENABLED", True), patch(
            "services.ai_worker_sandbox.docker", AsyncMock(return_value=(0, "27.0"))
        ):
            self.assertTrue(await sandbox_available())
        with patch.object(settings, "AI_WORKER_SANDBOX_ENABLED", True), patch(
            "services.ai_worker_sandbox.docker", AsyncMock(side_effect=TimeoutError)
        ):
            self.assertFalse(await sandbox_available())

    def setup_run(self, **overrides):
        execution = AIWorkerExecution(id=str(uuid4()), worker_id="worker", deployment_kind="cloud",
            status="running", lease_owner="runner", cancel_requested=False, task_description="Make a report",
            attempt=0, max_attempts=3)
        worker = AIWorker(id="worker", deployment_kind="cloud", status="deployed", sandbox_mode="off",
            allowed_tools=[], max_steps=4, max_cost_cents=100, max_runtime_seconds=60,
            model_provider="test", model_name="stub", **overrides)
        records = []
        async def get(model, key):
            if model is AIWorkerExecution: return execution
            if model is AIWorker: return worker
            return next((record for record in records if isinstance(record, model) and record.id == key), None)
        def add(record):
            if isinstance(record, AIWorkerApproval): record.id = str(uuid4())
            records.append(record)
        db = SimpleNamespace(get=AsyncMock(side_effect=get), refresh=AsyncMock(), commit=AsyncMock(),
                             rollback=AsyncMock(), flush=AsyncMock(), add=add)
        return execution, worker, db, records

    async def test_final_usage_is_saved(self):
        execution, worker, db, _ = self.setup_run()
        adapter = SimpleNamespace(decide=AsyncMock(return_value=runtime.AdapterResult(
            runtime.ModelDecision(completed=True, output="Done"), input_tokens=123, output_tokens=45)))
        with patch.object(runtime, "adapter_for", return_value=adapter):
            await runtime.run_execution(db, execution.id, "runner")
        self.assertEqual(execution.status, "completed")
        self.assertEqual(execution.usage["input_tokens"], 123)

    async def test_cancel_during_model_cannot_complete(self):
        execution, _, db, _ = self.setup_run()
        async def decide(**kwargs):
            execution.cancel_requested = True
            return runtime.AdapterResult(runtime.ModelDecision(completed=True, output="Done"))
        with patch.object(runtime, "adapter_for", return_value=SimpleNamespace(decide=decide)):
            await runtime.run_execution(db, execution.id, "runner")
        self.assertEqual(execution.status, "cancelled")
        self.assertIsNone(execution.result)

    async def test_lost_lease_cannot_publish(self):
        execution, _, db, _ = self.setup_run()
        async def decide(**kwargs):
            execution.lease_owner = "new-runner"
            return runtime.AdapterResult(runtime.ModelDecision(completed=True, output="Stale"))
        with patch.object(runtime, "adapter_for", return_value=SimpleNamespace(decide=decide)):
            await runtime.run_execution(db, execution.id, "runner")
        self.assertEqual(execution.status, "running")
        self.assertIsNone(execution.result)
        db.rollback.assert_awaited()

    async def test_sandbox_approval_restore_and_cleanup(self):
        execution, worker, db, records = self.setup_run()
        worker.sandbox_mode = "docker"
        worker.allowed_tools = ["write_file"]
        instances = []
        class FakeSandbox:
            name = "fake"
            def __init__(self, *args):
                self.start = AsyncMock(); self.close = AsyncMock()
                self.execute = AsyncMock(return_value={"bytes": 5})
                self.snapshot = AsyncMock(return_value={"report.txt": base64.b64encode(b"Hello").decode()})
                instances.append(self)
        adapter = SimpleNamespace(decide=AsyncMock(side_effect=[
            runtime.AdapterResult(runtime.ModelDecision(completed=False, tool_call=runtime.ToolCall(name="write_file", arguments={"path":"report.txt","content":"Hello"}))),
            runtime.AdapterResult(runtime.ModelDecision(completed=True, output="Report ready")),
        ]))
        with patch.object(runtime, "DockerSandbox", FakeSandbox), patch.object(runtime, "adapter_for", return_value=adapter):
            await runtime.run_execution(db, execution.id, "runner")
            self.assertEqual(execution.status, "waiting_approval")
            instances[0].execute.assert_not_awaited()
            instances[0].close.assert_awaited_once()
            approval = next(record for record in records if isinstance(record, AIWorkerApproval))
            approval.status = "approved"
            execution.status = "running"; execution.lease_owner = "runner"
            await runtime.run_execution(db, execution.id, "runner")
        self.assertEqual(execution.status, "completed")
        instances[1].execute.assert_awaited_once_with("write_file", {"path":"report.txt","content":"Hello"})
        instances[1].start.assert_awaited_once_with(execution.environment["files"])
        instances[1].close.assert_awaited_once()

    async def test_interrupted_action_is_not_replayed(self):
        execution, _, db, _ = self.setup_run()
        execution.checkpoint = {"inflight": {"tool": "update_task_status"}}
        with patch.object(runtime, "execute_tool", AsyncMock()) as tool:
            await runtime.run_execution(db, execution.id, "runner")
        self.assertEqual(execution.status, "failed")
        tool.assert_not_awaited()

    async def test_provisioning_failure_closes_container_without_retry(self):
        execution, worker, db, _ = self.setup_run()
        worker.sandbox_mode = "docker"
        sandbox = SimpleNamespace(name="failed", start=AsyncMock(side_effect=ValueError("Image is missing")), close=AsyncMock())
        with patch.object(runtime, "DockerSandbox", return_value=sandbox):
            await runtime.run_execution(db, execution.id, "runner")
        self.assertEqual(execution.status, "failed")
        self.assertIn("Image is missing", execution.error)
        sandbox.close.assert_awaited_once()

    async def test_runtime_budget_is_enforced_across_approval_resumes(self):
        execution, _, db, _ = self.setup_run()
        execution.checkpoint = {"active_seconds": 61}
        with patch.object(runtime, "adapter_for") as adapter:
            await runtime.run_execution(db, execution.id, "runner")
        self.assertEqual(execution.status, "failed")
        self.assertIn("runtime limit", execution.error)
        adapter.assert_not_called()

    async def test_workspace_tools_require_sandbox(self):
        with self.assertRaises(ValueError):
            WorkerCreate(project_id=1, name="worker", instructions="Work", model_name="stub", allowed_tools=["run_command"])


@unittest.skipUnless(os.getenv("HUZLR_TEST_DOCKER") == "1", "Set HUZLR_TEST_DOCKER=1 for container integration")
class DockerTests(unittest.IsolatedAsyncioTestCase):
    async def test_isolation_snapshot_restore_and_orphan_cleanup(self):
        with patch.object(settings, "AI_WORKER_SANDBOX_ENABLED", True), patch.object(settings, "AI_WORKER_SANDBOX_HOST_ID", f"test-{uuid4().hex}"):
            first = DockerSandbox(str(uuid4()), 60)
            second = DockerSandbox(str(uuid4()), 60)
            try:
                await first.start({})
                await first.execute("write_file", {"path": "nested/report.txt", "content": "Hello"})
                result = await first.execute("run_command", {"command": "id -u; test ! -e /var/run/docker.sock; test -z \"$OPENAI_API_KEY\"; test -z \"$DATABASE_URL\""})
                self.assertEqual(result["exit_code"], 0)
                self.assertEqual(result["stdout"].strip(), "1000")
                for path in ("../escape", "/etc/passwd"):
                    with self.assertRaises(ValueError): await first.execute("read_file", {"path": path})
                await first.execute("run_command", {"command": "ln -s /etc/passwd link"})
                with self.assertRaises(ValueError): await first.execute("read_file", {"path": "link"})
                code, raw = await docker("inspect", first.name)
                config = json.loads(raw)[0]
                self.assertEqual(config["HostConfig"]["NetworkMode"], "none")
                self.assertTrue(config["HostConfig"]["ReadonlyRootfs"])
                self.assertEqual(config["HostConfig"]["CapDrop"], ["ALL"])
                self.assertEqual(config["HostConfig"]["Memory"], settings.AI_WORKER_SANDBOX_MEMORY_MB * 1024 * 1024)
                files = await first.snapshot()
                await first.close()
                await second.start(files)
                self.assertEqual((await second.execute("read_file", {"path":"nested/report.txt"}))["content"], "Hello")
                await second.execute("run_command", {"command": "python -c \"open('large.bin', 'wb').write(bytes(1048577))\""})
                with self.assertRaises(ValueError): await second.snapshot()
                await reap_sandboxes(SimpleNamespace(get=AsyncMock(return_value=None)))
                self.assertNotEqual((await docker("inspect", second.name))[0], 0)
            finally:
                await first.close(); await second.close()


@unittest.skipUnless(os.getenv("HUZLR_TEST_POSTGRES") == "1" and os.getenv("HUZLR_TEST_DOCKER") == "1",
                     "Set HUZLR_TEST_POSTGRES=1 and HUZLR_TEST_DOCKER=1 for full runtime integration")
class PostgresDockerTests(unittest.IsolatedAsyncioTestCase):
    async def test_durable_approval_artifact_lifecycle(self):
        from sqlalchemy import select, text
        from sqlalchemy.schema import CreateTable
        from sqlalchemy.ext.asyncio import AsyncSession
        from core.database import engine
        from models.ai_worker import AIWorkerEvent
        try:
            async with engine.connect() as connection:
                outer = await connection.begin()
                try:
                    # Temporary tables shadow real tables. Outer rollback discards all test data.
                    await connection.execute(text("SET LOCAL search_path TO pg_temp"))
                    for cls in [AIWorker, AIWorkerExecution, AIWorkerEvent, AIWorkerApproval]:
                        ddl = str(CreateTable(cls.__table__, include_foreign_key_constraints=[]).compile(dialect=engine.dialect))
                        await connection.execute(text(ddl.replace("CREATE TABLE", "CREATE TEMPORARY TABLE")))
                    async with AsyncSession(bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint") as db:
                        worker = AIWorker(project_id=1, created_by=1, name="Integration", instructions="Make report",
                            model_provider="test", model_name="stub", allowed_tools=["write_file"], sandbox_mode="docker",
                            status="deployed", max_runtime_seconds=60)
                        db.add(worker); await db.flush()
                        execution = AIWorkerExecution(worker_id=worker.id, requested_by=1, task_description="Write report",
                            worker_version=1, deployment_kind="cloud", status="running", lease_owner="integration")
                        db.add(execution); await db.commit()
                        adapter = SimpleNamespace(decide=AsyncMock(side_effect=[
                            runtime.AdapterResult(runtime.ModelDecision(completed=False, tool_call=runtime.ToolCall(
                                name="write_file", arguments={"path":"report.txt","content":"Durable report"}))),
                            runtime.AdapterResult(runtime.ModelDecision(completed=True, output="Report ready"), input_tokens=10),
                        ]))
                        with patch.object(settings, "AI_WORKER_SANDBOX_ENABLED", True), patch.object(runtime, "adapter_for", return_value=adapter):
                            await runtime.run_execution(db, execution.id, "integration")
                            self.assertEqual(execution.status, "waiting_approval", execution.error)
                            approval = (await db.execute(select(AIWorkerApproval))).scalar_one()
                            approval.status = "approved"
                            execution.status = "running"; execution.lease_owner = "integration"
                            await db.commit()
                            await runtime.run_execution(db, execution.id, "integration")
                        self.assertEqual(execution.status, "completed", execution.error)
                        await db.refresh(execution)
                        self.assertEqual(base64.b64decode(execution.environment["files"]["report.txt"]), b"Durable report")
                        self.assertEqual(execution.usage["input_tokens"], 10)
                finally:
                    await outer.rollback()
        finally:
            await engine.dispose()


if __name__ == "__main__": unittest.main()
