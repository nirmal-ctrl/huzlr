import unittest
from uuid import uuid4
from pydantic import ValidationError
from worker_runtime.models import WorkerDefinition, ExecutionRecord, DeploymentKind, ExecutionStatus


class ContractsTests(unittest.TestCase):
    def test_worker_defaults_to_cloud(self):
        worker = WorkerDefinition(
            organization_id=uuid4(),
            name="Developer",
            instructions="Only inspect tasks",
            model_provider="test",
            model_name="stub",
        )
        self.assertEqual(worker.version, 1)
        self.assertEqual(worker.allowed_tools, [])
        self.assertEqual(worker.deployment_kind, DeploymentKind.CLOUD)

    def test_reject_customer_hosted_deployment(self):
        with self.assertRaises(ValidationError):
            WorkerDefinition(
                organization_id=uuid4(), name="Developer", instructions="Inspect",
                model_provider="test", model_name="stub", deployment_kind="customer_hosted",
            )

    def test_reject_invalid_step_limit(self):
        with self.assertRaises(ValidationError):
            WorkerDefinition(
                organization_id=uuid4(),
                name="Developer",
                instructions="Inspect",
                model_provider="test",
                model_name="stub",
                max_steps=0,
            )

    def test_execution_defaults(self):
        execution = ExecutionRecord(organization_id=uuid4(), worker_id=uuid4(), worker_version=1)
        self.assertEqual(execution.status, ExecutionStatus.QUEUED)


if __name__ == "__main__":
    unittest.main()
