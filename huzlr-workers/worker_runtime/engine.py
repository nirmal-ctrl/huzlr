"""Bounded execution engine. Provider and sandbox adapters are injected explicitly.

This foundation deliberately does not execute arbitrary shell commands, load
credentials, or call a model without a configured adapter.
"""
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Protocol

from .policy import ToolPolicy


@dataclass(frozen=True)
class ToolCall:
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True)
class AgentDecision:
    completed: bool
    output: str | None = None
    tool_call: ToolCall | None = None


class ModelAdapter(Protocol):
    async def decide(self, task: str, observations: list[dict[str, Any]]) -> AgentDecision: ...


ToolHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


class ExecutionEngine:
    def __init__(self, model: ModelAdapter, tools: dict[str, ToolHandler], policy: ToolPolicy, max_steps: int = 12):
        if not 1 <= max_steps <= 100:
            raise ValueError("max_steps must be between 1 and 100")
        self.model, self.tools, self.policy, self.max_steps = model, tools, policy, max_steps

    async def run(self, task: str) -> dict[str, Any]:
        observations: list[dict[str, Any]] = []
        for step in range(self.max_steps):
            decision = await self.model.decide(task, observations.copy())
            if decision.completed:
                return {"status": "completed", "output": decision.output, "steps": step + 1}
            if decision.tool_call is None:
                raise ValueError("Model must complete or request exactly one tool")
            call = decision.tool_call
            self.policy.authorize(call.name)
            handler = self.tools.get(call.name)
            if handler is None:
                raise ValueError(f"Tool is not registered: {call.name}")
            # Handler is invoked only after policy authorization; sandbox and\n            # approval checks must be implemented before untrusted tools run.\n            result = await handler(call.arguments)
            observations.append({"tool": call.name, "result": result})
        return {"status": "step_limit_reached", "steps": self.max_steps}
