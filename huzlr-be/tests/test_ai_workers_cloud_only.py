"""Cloud-only API boundary and consumer regressions; no database or provider calls."""

import asyncio
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.v1.endpoints import ai_workers
from models.ai_worker import AIWorker, AIWorkerExecution
from services.ai_worker_runtime import run_execution


class CloudOnlyTests(unittest.TestCase):
    def test_reject_removed_deployment_on_create_and_update(self):
        payload = dict(project_id=1, name="Worker", instructions="Review tasks",
                       model_provider="test", model_name="stub")
        self.assertEqual(ai_workers.WorkerCreate(**payload).deployment_kind, "cloud")
        for value in ("customer_hosted", "on_premise", None):
            with self.subTest(deployment=value):
                with self.assertRaises(ValidationError):
                    ai_workers.WorkerCreate(**payload, deployment_kind=value)
                with self.assertRaises(ValidationError):
                    ai_workers.WorkerUpdate(deployment_kind=value)

    def test_node_transport_is_not_exposed(self):
        app = FastAPI()
        app.include_router(ai_workers.router, prefix="/ai-workers")
        self.assertFalse(any("/nodes" in path for path in app.openapi()["paths"]))
        with TestClient(app) as client:
            for method, path in [
                ("POST", "/nodes/"),
                ("DELETE", "/nodes/node-id"),
                ("POST", "/nodes/internal/claim"),
                ("POST", "/nodes/internal/executions/run/heartbeat"),
                ("POST", "/nodes/internal/executions/run/tools"),
                ("POST", "/nodes/internal/executions/run/result"),
            ]:
                with self.subTest(path=path):
                    self.assertIn(client.request(method, "/ai-workers" + path).status_code, (404, 405))

    def test_cloud_execution_still_completes(self):
        execution = AIWorkerExecution(id="run", worker_id="worker", deployment_kind="cloud",
                                      status="running", lease_owner="runner", cancel_requested=False,
                                      task_description="Review a task")
        worker = AIWorker(id="worker", deployment_kind="cloud", status="deployed",
                          allowed_tools=[], max_steps=2, max_cost_cents=100,
                          model_provider="test", model_name="stub")
        db = SimpleNamespace(get=AsyncMock(side_effect=[execution, worker]),
                             refresh=AsyncMock(), commit=AsyncMock(), add=lambda record: None)
        asyncio.run(run_execution(db, "run", "runner"))
        self.assertEqual(execution.status, "completed")
        self.assertIn("Review a task", execution.result["output"])

    def test_consumer_cannot_execute_retired_deployments(self):
        execution = AIWorkerExecution(id="run", worker_id="worker", deployment_kind="customer_hosted",
                                      status="running", lease_owner="runner")
        db = SimpleNamespace(get=AsyncMock(return_value=execution))
        asyncio.run(run_execution(db, "run", "runner"))
        self.assertEqual(db.get.await_count, 1)
        self.assertEqual(execution.status, "running")


if __name__ == "__main__":
    unittest.main()
