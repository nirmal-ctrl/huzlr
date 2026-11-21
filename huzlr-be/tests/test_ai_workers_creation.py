"""Creation chat drafts settings without creating workers, granting access or executing tools."""
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from fastapi import HTTPException
from pydantic import ValidationError
from api.v1.endpoints import ai_workers as api
from services import ai_worker_creation as creation
from core.config import settings

PROPOSAL = {"name": "Delivery partner", "instructions": "Review project tasks and summarize blockers. Never change tasks.",
            "allowed_tools": ["get_task", "list_project_tasks"], "sandbox_mode": "off",
            "max_steps": 12, "max_cost_cents": 100, "max_runtime_seconds": 600}


class CreationContracts(unittest.TestCase):
    def test_requires_workspace_or_legacy_project_scope(self):
        with self.assertRaises(ValidationError):
            api.WorkerCreate(name="Writer", instructions="Write", model_name="stub")
        worker = api.WorkerCreate(workspace_id=3, name="Writer", instructions="Write", model_name="stub")
        self.assertIsNone(worker.project_id)
        self.assertEqual(worker.workspace_id, 3)

    def test_only_supported_settings_and_tools(self):
        for overrides in [{"allowed_tools":["send_email"]}, {"allowed_tools":["run_command"], "sandbox_mode":"off"},
                          {"max_steps":101}, {"deployment_kind":"customer_hosted"}, {"api_key":"secret"}, {"name":"   "}]:
            with self.subTest(overrides=overrides), self.assertRaises(ValidationError):
                creation.CreationProposal(**{**PROPOSAL, **overrides})

    def test_request_requires_a_current_user_turn(self):
        for messages in [[], [{"role":"assistant","content":"Hello"}], [{"role":"user","content":"   "}]]:
            with self.subTest(messages=messages), self.assertRaises(ValidationError):
                api.WorkerChatRequest(project_id=1, messages=messages)


class CreationEndpointTests(unittest.IsolatedAsyncioTestCase):
    def payload(self):
        return api.WorkerChatRequest(workspace_id=1, messages=[{"role":"user","content":"Make a delivery partner"}],
                                     current_configuration={"model_provider":"gemini","model_name":"gemini-2.5-flash"})

    def db(self):
        return SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(team_id=10)), rollback=AsyncMock(),
                               add=MagicMock(), commit=AsyncMock())

    async def test_authorizes_workspace_before_model_call(self):
        db = self.db()
        with patch.object(api, "assert_workspace_member", AsyncMock(side_effect=HTTPException(403, "Denied"))), patch.object(api, "draft_worker_configuration", AsyncMock()) as generate:
            with self.assertRaises(HTTPException) as error:
                await api.draft_worker(self.payload(), db, SimpleNamespace(id=2))
        self.assertEqual(error.exception.status_code, 403)
        generate.assert_not_awaited()

    async def test_returns_draft_without_creating_or_activating_worker(self):
        db = self.db()
        reply = creation.CreationReply(message="Review this draft.", configuration=PROPOSAL)
        with patch.object(api, "assert_workspace_member", AsyncMock()), patch.object(api, "draft_worker_configuration", AsyncMock(return_value=reply)) as generate:
            actual = await api.draft_worker(self.payload(), db, SimpleNamespace(id=2))
        self.assertEqual(actual.configuration.name, "Delivery partner")
        db.rollback.assert_awaited_once()
        db.add.assert_not_called(); db.commit.assert_not_awaited()
        self.assertEqual(generate.call_args.args[1]["model_provider"], "gemini")

    async def test_missing_provider_has_actionable_error_and_no_write(self):
        db = self.db()
        with patch.object(api, "assert_workspace_member", AsyncMock()), patch.object(api, "draft_worker_configuration", AsyncMock(side_effect=creation.CreationUnavailable("Use manual setup"))):
            with self.assertRaises(HTTPException) as error:
                await api.draft_worker(self.payload(), db, SimpleNamespace(id=2))
        self.assertEqual(error.exception.status_code, 503)
        db.add.assert_not_called()


class CreationProviderTests(unittest.IsolatedAsyncioTestCase):
    def client(self, reply):
        return SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=AsyncMock(
            return_value=SimpleNamespace(text=json.dumps(reply)))), aclose=AsyncMock()))

    async def test_gemini_structured_draft_and_connection_cleanup(self):
        client = self.client({"message":"Here is your draft.","configuration":PROPOSAL})
        with patch.object(settings, "GEMINI_API_KEY", "test-key"), patch.object(creation.genai, "Client", return_value=client):
            reply = await creation.draft_worker_configuration([creation.CreationMessage(role="user",content="Draft a worker")], {})
        self.assertEqual(reply.configuration.allowed_tools, PROPOSAL["allowed_tools"])
        client.aio.aclose.assert_awaited_once()
        config = client.aio.models.generate_content.call_args.kwargs["config"]
        self.assertNotIn("tools", config)
        self.assertNotIn("additionalProperties", json.dumps(config["response_schema"]))

    async def test_clarifying_question_without_configuration(self):
        client = self.client({"message":"What work should it do?","configuration":None})
        with patch.object(settings, "GEMINI_API_KEY", "test-key"), patch.object(creation.genai, "Client", return_value=client):
            reply = await creation.draft_worker_configuration([creation.CreationMessage(role="user",content="Hello")], {})
        self.assertIsNone(reply.configuration)

    async def test_rejects_unavailable_sandbox(self):
        client = self.client({"message":"Draft", "configuration":{**PROPOSAL,"sandbox_mode":"docker","allowed_tools":["read_file"]}})
        with patch.object(settings, "GEMINI_API_KEY", "test-key"), patch.object(settings, "AI_WORKER_SANDBOX_ENABLED", False), patch.object(creation.genai, "Client", return_value=client):
            with self.assertRaises(ValueError):
                await creation.draft_worker_configuration([creation.CreationMessage(role="user",content="Read files")], {})
        client.aio.aclose.assert_awaited_once()

    async def test_openai_fallback_uses_server_credentials(self):
        response = SimpleNamespace(raise_for_status=lambda:None, json=lambda:{"choices":[{"message":{"content":json.dumps({"message":"Draft", "configuration":PROPOSAL})}}]})
        client = AsyncMock(); client.post.return_value = response
        client.__aenter__.return_value = client
        with patch.object(settings, "GEMINI_API_KEY", ""), patch.object(settings, "OPENAI_API_KEY", "test-key"), patch.object(creation.httpx, "AsyncClient", return_value=client):
            reply = await creation.draft_worker_configuration([creation.CreationMessage(role="user",content="Draft worker")], {})
        self.assertEqual(reply.configuration.name, "Delivery partner")
        self.assertEqual(client.post.call_args.kwargs["headers"]["Authorization"], "Bearer test-key")


if __name__ == "__main__": unittest.main()
