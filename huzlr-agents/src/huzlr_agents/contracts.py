BRAINSTORM_AGENT_NAME = "huzlr-brainstorm"
FOUNDER_AGENT_NAME = "huzlr-founder"
SCRUM_MASTER_AGENT_NAME = "huzlr-scrum-master"

BRAINSTORM_ROOM_TYPE = "brainstorm-room"
FOUNDER_ROOM_TYPE = "founder-room"
SCRUM_MASTER_ROOM_PREFIX = "scrum-"


def is_room_type(room_name: str, room_type: str) -> bool:
    return room_name == room_type or room_name.startswith(f"{room_type}-")
