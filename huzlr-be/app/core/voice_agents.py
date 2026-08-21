"""Shared routing constants for the interactive LiveKit voice agents."""

BRAINSTORM_ROOM_TYPE = "brainstorm-room"
FOUNDER_ROOM_TYPE = "founder-room"

BRAINSTORM_AGENT_NAME = "huzlr-brainstorm"
FOUNDER_AGENT_NAME = "huzlr-founder"
SCRUM_MASTER_AGENT_NAME = "huzlr-scrum-master"

VOICE_AGENT_ROUTES = {
    BRAINSTORM_ROOM_TYPE: BRAINSTORM_AGENT_NAME,
    FOUNDER_ROOM_TYPE: FOUNDER_AGENT_NAME,
}


def is_voice_agent_room(room_name: str, room_type: str) -> bool:
    """Return whether a concrete room belongs to the requested voice-agent type."""
    return room_name == room_type or room_name.startswith(f"{room_type}-")
