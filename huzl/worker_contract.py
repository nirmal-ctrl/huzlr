from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class JobStatus(str, Enum):
    QUEUED = "queued"
    STARTING = "starting"
    AUTHENTICATING = "authenticating"
    WAITING_FOR_ADMISSION = "waiting_for_admission"
    JOINED = "joined"
    LEAVING = "leaving"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class MeetingJob:
    job_id: str
    meeting_id: int
    workspace_id: int
    meet_url: str
    starts_at: datetime
    bot_name: str
    max_duration_minutes: int
    transcript_enabled: bool
    summary_enabled: bool
    action_items_enabled: bool
    livekit_url: Optional[str]
    livekit_token: Optional[str]
    livekit_room: Optional[str]

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "MeetingJob":
        required = ("job_id", "meeting_id", "workspace_id", "meet_url", "starts_at")
        missing = [field for field in required if not payload.get(field)]
        if missing:
            raise ValueError(f"Missing job fields: {', '.join(missing)}")

        max_duration = int(payload.get("max_duration_minutes", 60))
        if not 1 <= max_duration <= 240:
            raise ValueError("max_duration_minutes must be between 1 and 240")

        outputs = payload.get("outputs") or {}
        return cls(
            job_id=str(payload["job_id"]),
            meeting_id=int(payload["meeting_id"]),
            workspace_id=int(payload["workspace_id"]),
            meet_url=str(payload["meet_url"]),
            starts_at=datetime.fromisoformat(str(payload["starts_at"]).replace("Z", "+00:00")),
            bot_name=str(payload.get("bot_name") or "Huzlr Scrum Master"),
            max_duration_minutes=max_duration,
            transcript_enabled=bool(outputs.get("transcript", True)),
            summary_enabled=bool(outputs.get("summary", True)),
            action_items_enabled=bool(outputs.get("action_items", True)),
            livekit_url=payload.get("livekit_url"),
            livekit_token=payload.get("livekit_token"),
            livekit_room=payload.get("livekit_room"),
        )


@dataclass(frozen=True)
class WorkerControl:
    cancel_requested: bool = False
