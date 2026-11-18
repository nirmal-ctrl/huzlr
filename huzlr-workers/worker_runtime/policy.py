"""Deny-by-default tool authorization, independent of model output."""
from dataclasses import dataclass


@dataclass(frozen=True)
class ToolPolicy:
    allowed_tools: frozenset[str]

    def authorize(self, tool_name: str) -> None:
        if tool_name not in self.allowed_tools:
            raise PermissionError(f"Tool not authorized: {tool_name}")
