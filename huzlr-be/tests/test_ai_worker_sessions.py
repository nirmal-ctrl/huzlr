"""Chat-session queueing and reply persistence regressions."""

import asyncio
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))

from fastapi import HTTPException

from api.v1.endpoints import ai_workers as api
from models.ai_worker import AIWorkerExecution, AIWorkerSessionMessage
from services import ai_worker_runtime as runtime
import ai_worker as consumer


class FakeSession:
    def __init__(self, *, scalar_values=(0, 0), previous=()):
        self.scalar = AsyncMock(side_effect=scalar_values)
        self.execute = AsyncMock(
            return_value=SimpleNamespace(
                scalars=lambda: SimpleNamespace(all=lambda: list(previous))
            )
        )
        self.commit = AsyncMock()
        self.refresh = AsyncMock()
        self.records = []

    def add(self, record):
        if isinstance(record, AIWorkerExecution) and record.id is None:
            record.id = "execution-1"
        self.records.append(record)

    async def flush(self):
        return None


class AsyncContext:
    async def __aenter__(self):
        return SimpleNamespace()

    async def __aexit__(self, *_args):
        return False


class SessionMessageTests(unittest.TestCase):
    def setUp(self):
        self.session = SimpleNamespace(
            id="session-1", title="New chat", updated_at=None
        )
        self.worker = SimpleNamespace(
            id="worker-1",
            status="deployed",
            project_id=None,
            version=3,
            deployment_kind="cloud",
        )
        self.user = SimpleNamespace(id=7)

    def test_follow_up_queues_with_session_history(self):
        previous = [
            SimpleNamespace(role="assistant", content="First reply"),
            SimpleNamespace(role="user", content="First request"),
        ]
        db = FakeSession(previous=previous)
        detail = SimpleNamespace(id=self.session.id)
        with (
            patch.object(
                api,
                "authorized_session",
                AsyncMock(return_value=(self.session, self.worker)),
            ),
            patch.object(api, "session_detail", AsyncMock(return_value=detail)),
        ):
            result = asyncio.run(
                api.send_session_message(
                    self.session.id,
                    api.SessionMessageCreate(content="Follow up"),
                    db,
                    self.user,
                )
            )

        execution = next(
            record for record in db.records if isinstance(record, AIWorkerExecution)
        )
        message = next(
            record
            for record in db.records
            if isinstance(record, AIWorkerSessionMessage)
        )
        self.assertIs(result, detail)
        self.assertEqual(execution.session_id, self.session.id)
        self.assertEqual(
            execution.conversation,
            [
                {"role": "user", "content": "First request"},
                {"role": "assistant", "content": "First reply"},
            ],
        )
        self.assertEqual(message.execution_id, execution.id)
        self.assertEqual(self.session.title, "Follow up")

    def test_second_message_is_rejected_while_session_is_busy(self):
        db = FakeSession(scalar_values=(1,))
        with patch.object(
            api,
            "authorized_session",
            AsyncMock(return_value=(self.session, self.worker)),
        ):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(
                    api.send_session_message(
                        self.session.id,
                        api.SessionMessageCreate(content="Too soon"),
                        db,
                        self.user,
                    )
                )
        self.assertEqual(error.exception.status_code, 409)
        self.assertFalse(db.records)


class SessionReplyTests(unittest.TestCase):
    def test_completed_execution_creates_one_assistant_message(self):
        execution = AIWorkerExecution(
            id="execution-1",
            worker_id="worker-1",
            requested_by=7,
            session_id="session-1",
            task_description="Request",
            worker_version=1,
            deployment_kind="cloud",
        )
        session = SimpleNamespace(updated_at=None)
        db = SimpleNamespace(
            scalar=AsyncMock(return_value=None),
            get=AsyncMock(return_value=session),
            add=unittest.mock.Mock(),
            commit=AsyncMock(),
        )
        with patch.object(runtime, "add_event", AsyncMock()):
            asyncio.run(
                runtime._finish(
                    db,
                    execution,
                    "completed",
                    result={"output": "Saved reply"},
                )
            )
        reply = db.add.call_args.args[0]
        self.assertIsInstance(reply, AIWorkerSessionMessage)
        self.assertEqual(reply.content, "Saved reply")
        self.assertEqual(reply.execution_id, execution.id)
        db.commit.assert_awaited_once()


class ConsumerCleanupTests(unittest.TestCase):
    def test_docker_cleanup_failure_does_not_escape(self):
        cleanup = AsyncMock(side_effect=TimeoutError("Docker unavailable"))
        with (
            patch.object(consumer, "AsyncSessionLocal", return_value=AsyncContext()),
            patch.object(consumer, "reap_sandboxes", cleanup),
        ):
            self.assertFalse(asyncio.run(consumer.cleanup_sandboxes()))
        cleanup.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
