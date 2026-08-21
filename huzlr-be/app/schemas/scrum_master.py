from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ScrumMasterSettingsUpdate(BaseModel):
    bot_name: str = Field(min_length=1, max_length=120)
    bot_account_email: Optional[str] = Field(default=None, max_length=255)
    auto_join: bool = False
    join_only_organized: bool = True
    require_scrum_tag: bool = False
    join_buffer_minutes: int = Field(default=2, ge=0, le=15)
    max_meeting_minutes: int = Field(default=60, ge=15, le=240)
    transcript_enabled: bool = True
    summary_enabled: bool = True
    action_items_enabled: bool = True


class ScrumMasterSettingsResponse(ScrumMasterSettingsUpdate):
    workspace_id: int

    class Config:
        from_attributes = True


class CalendarConnectionResponse(BaseModel):
    id: int
    email: str
    last_synced_at: Optional[datetime] = None
    requires_reconnect: bool = False

    class Config:
        from_attributes = True


class CalendarStatusResponse(BaseModel):
    connected: bool
    can_manage: bool = False
    requires_reconnect: bool = False
    connections: list[CalendarConnectionResponse] = Field(default_factory=list)


class CalendarConnectResponse(BaseModel):
    authorization_url: str


class MeetingResponse(BaseModel):
    id: int
    workspace_id: int
    title: str
    starts_at: datetime
    ends_at: datetime
    meet_url: Optional[str] = None
    organizer_email: Optional[str] = None
    attendees_count: int
    bot_enabled: bool
    status: str
    joined_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    outputs: dict

    class Config:
        from_attributes = True


class MeetingPageResponse(BaseModel):
    items: list[MeetingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    bot_scheduled_total: int


class CalendarSyncResponse(BaseModel):
    synced_count: int
    connection_count: int


class TranscriptSegmentResponse(BaseModel):
    id: int
    speaker_type: str
    speaker_id: Optional[str] = None
    text: str
    interrupted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingDetailResponse(MeetingResponse):
    transcript: list[TranscriptSegmentResponse] = Field(default_factory=list)


class WorkerJobResponse(BaseModel):
    job_id: str
    meeting_id: int
    workspace_id: int
    meet_url: str
    starts_at: datetime
    bot_name: str
    max_duration_minutes: int
    outputs: dict[str, bool]
    livekit_url: Optional[str] = None
    livekit_token: Optional[str] = None
    livekit_room: Optional[str] = None


class WorkerStatusUpdate(BaseModel):
    status: str
    error_code: Optional[str] = Field(default=None, max_length=120)
    error_message: Optional[str] = Field(default=None, max_length=1000)


class WorkerControlResponse(BaseModel):
    cancel_requested: bool
