from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.scrum_master_defaults import (
    DEFAULT_SCRUM_MASTER_AGENT_PROMPT,
    DEFAULT_SCRUM_MASTER_INTRODUCTION,
)
from models.base import Base


class ScrumMasterSettings(Base):
    __tablename__ = "scrum_master_settings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.id"), nullable=False, unique=True, index=True)
    bot_name: Mapped[str] = mapped_column(String(120), default="Huzlr Scrum Master")
    bot_account_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    agent_prompt: Mapped[str] = mapped_column(Text, nullable=False, default=DEFAULT_SCRUM_MASTER_AGENT_PROMPT)
    introduction_message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=DEFAULT_SCRUM_MASTER_INTRODUCTION,
    )
    auto_join: Mapped[bool] = mapped_column(Boolean, default=False)
    join_only_organized: Mapped[bool] = mapped_column(Boolean, default=True)
    require_scrum_tag: Mapped[bool] = mapped_column(Boolean, default=False)
    join_buffer_minutes: Mapped[int] = mapped_column(Integer, default=2)
    max_meeting_minutes: Mapped[int] = mapped_column(Integer, default=60)
    transcript_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    summary_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    action_items_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class GoogleCalendarConnection(Base):
    __tablename__ = "google_calendar_connections"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.id"), nullable=False, index=True)
    connected_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("workspace_id", "email", name="uq_google_calendar_connection_workspace_email"),
    )


class ScrumMeeting(Base):
    __tablename__ = "scrum_meetings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.id"), nullable=False, index=True)
    calendar_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    meet_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    organizer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    attendees_count: Mapped[int] = mapped_column(Integer, default=0)
    bot_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    force_join: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(40), default="not_scheduled", index=True)
    job_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, unique=True, index=True)
    cancel_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    heartbeat_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outputs: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("workspace_id", "calendar_event_id", name="uq_scrum_meeting_calendar_event"),
    )


class MeetingTranscriptSegment(Base):
    __tablename__ = "meeting_transcript_segments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("scrum_meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    speaker_type: Mapped[str] = mapped_column(String(20), nullable=False)
    speaker_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    interrupted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
