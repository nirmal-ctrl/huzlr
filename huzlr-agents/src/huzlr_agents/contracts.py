import json
from dataclasses import dataclass


BRAINSTORM_AGENT_NAME = "huzlr-brainstorm"
FOUNDER_AGENT_NAME = "huzlr-founder"
SCRUM_MASTER_AGENT_NAME = "huzlr-scrum-master"

BRAINSTORM_ROOM_TYPE = "brainstorm-room"
FOUNDER_ROOM_TYPE = "founder-room"
SCRUM_MASTER_ROOM_PREFIX = "scrum-"

DEFAULT_SCRUM_MASTER_AGENT_PROMPT = """You are Huzlr Scrum Master, an explicitly identified AI participant in a team meeting.
Listen carefully and facilitate concise standups. Track completed work, planned work,
blockers, decisions, and proposed action items. Never claim to be a human. Do not create,
assign, or change project work without explicit participant confirmation. Keep spoken
responses short, avoid interrupting, and do not reveal information from other workspaces.
At the beginning, state that you are an AI meeting assistant and that transcription or
summarization may be enabled by the workspace administrator."""
DEFAULT_SCRUM_MASTER_INTRODUCTION = (
    "Hello, I am the Huzlr AI Scrum Master. I will help facilitate and may prepare "
    "meeting notes according to your workspace settings."
)


@dataclass(frozen=True)
class ScrumMasterConversationConfig:
    agent_prompt: str = DEFAULT_SCRUM_MASTER_AGENT_PROMPT
    introduction_message: str = DEFAULT_SCRUM_MASTER_INTRODUCTION
    voice_mode: str = "pipeline"

    @classmethod
    def from_metadata(cls, metadata: str | None) -> "ScrumMasterConversationConfig":
        try:
            value = json.loads(metadata or "{}")
        except (TypeError, ValueError):
            value = {}
        if not isinstance(value, dict):
            value = {}

        prompt = value.get("agent_prompt")
        introduction = value.get("introduction_message")
        voice_mode = value.get("voice_mode", "pipeline")
        if voice_mode not in ("pipeline", "gemini_live"):
            raise ValueError(f"Unsupported Scrum Master voice mode: {voice_mode!r}")
        return cls(
            voice_mode=voice_mode,
            agent_prompt=(
                prompt.strip()
                if isinstance(prompt, str) and prompt.strip()
                else DEFAULT_SCRUM_MASTER_AGENT_PROMPT
            ),
            introduction_message=(
                introduction.strip()
                if isinstance(introduction, str) and introduction.strip()
                else DEFAULT_SCRUM_MASTER_INTRODUCTION
            ),
        )


def is_room_type(room_name: str, room_type: str) -> bool:
    return room_name == room_type or room_name.startswith(f"{room_type}-")
