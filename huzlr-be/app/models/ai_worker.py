"""Persistence models for durable, policy-controlled AI Worker execution."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AIWorker(Base):
    __tablename__ = "ai_workers"
    __table_args__ = (
        CheckConstraint("deployment_kind = 'cloud' OR status = 'disabled'", name="ck_ai_workers_cloud_active"),
        CheckConstraint("sandbox_mode IN ('off', 'docker')", name="ck_ai_workers_sandbox_mode"),
        CheckConstraint("max_runtime_seconds BETWEEN 30 AND 1800", name="ck_ai_workers_runtime"),
        Index("ix_ai_workers_project_cursor", "project_id", "created_at", "id"),
        Index("ix_ai_workers_workspace_cursor", "workspace_id", "created_at", "id"),
        CheckConstraint("project_id IS NOT NULL OR workspace_id IS NOT NULL", name="ck_ai_workers_scope"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=True, index=True)
    workspace_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    created_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    model_provider: Mapped[str] = mapped_column(String(80), nullable=False)
    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    deployment_kind: Mapped[str] = mapped_column(String(30), nullable=False, default="cloud")
    allowed_tools: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    max_steps: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    max_cost_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    sandbox_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="off", server_default="off")
    max_runtime_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=600, server_default="600")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    executions: Mapped[list["AIWorkerExecution"]] = relationship(back_populates="worker", cascade="all, delete-orphan")
    sessions: Mapped[list["AIWorkerSession"]] = relationship(back_populates="worker", cascade="all, delete-orphan")


class AIWorkerSession(Base):
    __tablename__ = "ai_worker_sessions"
    __table_args__ = (
        Index("ix_ai_worker_sessions_workspace_user_updated", "workspace_id", "created_by", "updated_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    worker_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_workers.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False, default="New chat")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    worker: Mapped["AIWorker"] = relationship(back_populates="sessions")
    messages: Mapped[list["AIWorkerSessionMessage"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class AIWorkerExecution(Base):
    __tablename__ = "ai_worker_executions"
    __table_args__ = (
        UniqueConstraint("worker_id", "idempotency_key", name="uq_ai_worker_execution_idempotency"),
        Index("ix_ai_worker_executions_worker_cursor", "worker_id", "created_at", "id"),
        CheckConstraint("deployment_kind = 'cloud' OR status IN ('completed', 'failed', 'cancelled')", name="ck_ai_worker_executions_cloud_active"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    worker_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_workers.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    task_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("issues.id", ondelete="SET NULL"), nullable=True)
    project_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ai_worker_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    task_description: Mapped[str] = mapped_column(Text, nullable=False)
    conversation: Mapped[list] = mapped_column(JSON, nullable=False, default=list, server_default="[]")
    worker_version: Mapped[int] = mapped_column(Integer, nullable=False)
    deployment_kind: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="queued", index=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, index=True)
    lease_owner: Mapped[str | None] = mapped_column(String(120), nullable=True)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_requested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    checkpoint: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    environment: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    usage: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    worker: Mapped[AIWorker] = relationship(back_populates="executions")
    events: Mapped[list["AIWorkerEvent"]] = relationship(back_populates="execution", cascade="all, delete-orphan")
    approvals: Mapped[list["AIWorkerApproval"]] = relationship(back_populates="execution", cascade="all, delete-orphan")


class AIWorkerSessionMessage(Base):
    __tablename__ = "ai_worker_session_messages"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="ck_ai_worker_session_message_role"),
        Index("ix_ai_worker_session_messages_session_created", "session_id", "created_at", "id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_worker_sessions.id", ondelete="CASCADE"), nullable=False)
    execution_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ai_worker_executions.id", ondelete="SET NULL"), nullable=True, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    session: Mapped[AIWorkerSession] = relationship(back_populates="messages")


class AIWorkerEvent(Base):
    __tablename__ = "ai_worker_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    execution_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_worker_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    execution: Mapped[AIWorkerExecution] = relationship(back_populates="events")


class AIWorkerApproval(Base):
    __tablename__ = "ai_worker_approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    execution_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_worker_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name: Mapped[str] = mapped_column(String(120), nullable=False)
    arguments: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending", index=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    execution: Mapped[AIWorkerExecution] = relationship(back_populates="approvals")


class AIWorkerNode(Base):
    """Retired enrollment records retained for audit history only.

    There is no node transport or enrollment API. Keep this mapping so future
    schema generation preserves historical records rather than dropping them.
    """

    __tablename__ = "ai_worker_nodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    token_digest: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
