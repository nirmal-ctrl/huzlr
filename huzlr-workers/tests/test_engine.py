"""Contract tests with a deterministic model stub; no external credentials."""
import asyncio
import unittest

from worker_runtime.engine import AgentDecision, ExecutionEngine, ToolCall
from worker_runtime.policy import ToolPolicy


class StubModel:
    def __init__(self):
        self.calls = 0

    async def decide(self, task, observations):
        self.calls += 1
        if not observations:
            return AgentDecision(completed=False, tool_call=ToolCall("read_task", {"id": task}))
        return AgentDecision(completed=True, output=observations[0]["result"]["title"])


class EngineTests(unittest.TestCase):
    def test_allowed_tool(self):
        async def read_task(args):
            return {"title": "Task " + args["id"]}

        engine = ExecutionEngine(StubModel(), {"read_task": read_task}, ToolPolicy(frozenset({"read_task"})))
        result = asyncio.run(engine.run("123"))
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["output"], "Task 123")

    def test_denied_tool(self):
        engine = ExecutionEngine(StubModel(), {}, ToolPolicy(frozenset()))
        with self.assertRaises(PermissionError):
            asyncio.run(engine.run("123"))

    def test_invalid_step_limit(self):
        with self.assertRaises(ValueError):
            ExecutionEngine(StubModel(), {}, ToolPolicy(frozenset()), max_steps=0)

    def test_reject_ambiguous_model_decision(self):
        with self.assertRaises(ValueError):
            AgentDecision(completed=True, output="done", tool_call=ToolCall("read_task", {}))

    def test_reject_empty_completion(self):
        with self.assertRaises(ValueError):
            AgentDecision(completed=True, output="")


if __name__ == "__main__":
    unittest.main()
