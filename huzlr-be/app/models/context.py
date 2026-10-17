"""Durable context control plane. Operational entities remain in their original tables."""
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


def now():
    return datetime.now(timezone.utc)


class ContextSession(Base):
    __tablename__ = "context_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.id", ondelete="CASCADE"))
    project_ids: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ContextJob(Base):
    __tablename__ = "context_jobs"
    # No project FK: deletion must remain deliverable after the project disappears.
    project_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger)
    revision: Mapped[int] = mapped_column(BigInteger, default=1)
    applied_revision: Mapped[int] = mapped_column(BigInteger, default=0)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    lease_token: Mapped[str | None] = mapped_column(String(36), nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    enrichment_revision: Mapped[int] = mapped_column(BigInteger, default=0)
    enrichment_attempts: Mapped[int] = mapped_column(Integer, default=0)
    enrichment_available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    enrichment_error: Mapped[str | None] = mapped_column(Text, nullable=True)


class ContextEvent(Base):
    __tablename__ = "context_events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    project_id: Mapped[int] = mapped_column(Integer, index=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger)
    kind: Mapped[str] = mapped_column(String(120))
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ContextNote(Base):
    __tablename__ = "context_notes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ContextClaim(Base):
    __tablename__ = "context_claims"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"))
    source_id: Mapped[str] = mapped_column(String(500))
    source_version: Mapped[str] = mapped_column(String(64))
    jira_object_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("jira_source_objects.id", ondelete="CASCADE"), nullable=True)
    predicate: Mapped[str] = mapped_column(String(40))
    statement: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="proposed")
    confidence: Mapped[float] = mapped_column(Float)
    reviewed_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ContextAction(Base):
    __tablename__ = "context_actions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("context_sessions.id", ondelete="CASCADE"))
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"))
    payload: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="proposed")
    issue_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class MeetingProject(Base):
    __tablename__ = "meeting_projects"
    meeting_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("scrum_meetings.id", ondelete="CASCADE"), primary_key=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), primary_key=True)
    configured_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"))


class ContextArtifact(Base):
    __tablename__ = "context_artifacts"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"))
    source_id: Mapped[str] = mapped_column(String(500))
    version: Mapped[str] = mapped_column(String(64))
    jira_object_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("jira_source_objects.id", ondelete="CASCADE"), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    enrichment: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ContextTurn(Base):
    __tablename__ = "context_turns"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("context_sessions.id", ondelete="CASCADE"))
    user_text: Mapped[str] = mapped_column(Text)
    answer: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
