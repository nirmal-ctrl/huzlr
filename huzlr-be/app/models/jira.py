from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, BigInteger, DateTime, ForeignKey, Text, JSON, UniqueConstraint, Index, text
from datetime import datetime, timezone
from uuid import uuid4
from models.base import Base

class JiraConnection(Base):
    __tablename__ = "jira_connections"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), unique=True)
    
    # Encrypted tokens
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    scope: Mapped[str] = mapped_column(String(500), nullable=True)
    atlassian_cloud_id: Mapped[str] = mapped_column(String(100), nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sites: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="connected", nullable=False)
    
    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="jira_connection")


def now():
    return datetime.now(timezone.utc)


class JiraOAuthState(Base):
    __tablename__ = "jira_oauth_states"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class JiraBinding(Base):
    __tablename__ = "jira_project_bindings"
    __table_args__ = (UniqueConstraint("connection_id", "project_id", "cloud_id", "jira_project_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    connection_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jira_connections.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), index=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.id", ondelete="CASCADE"))
    cloud_id: Mapped[str] = mapped_column(String(100))
    site_url: Mapped[str] = mapped_column(String(500))
    jira_project_id: Mapped[str] = mapped_column(String(100))
    project_key: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(300))
    filter_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active")
    revision: Mapped[int] = mapped_column(BigInteger, default=0)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reconciled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_sync_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    webhook_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    webhook_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    webhook_next_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    webhook_error: Mapped[str | None] = mapped_column(String(120), nullable=True)


class JiraSyncRun(Base):
    __tablename__ = "jira_sync_runs"
    __table_args__ = (Index("jira_one_active_run", "binding_id", unique=True,
        postgresql_where=text("status IN ('queued', 'running')")),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    binding_id: Mapped[str] = mapped_column(String(36), ForeignKey("jira_project_bindings.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="queued")
    mode: Mapped[str] = mapped_column(String(20), default="full")
    coverage: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(String(120), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class JiraSyncTask(Base):
    __tablename__ = "jira_sync_tasks"
    __table_args__ = (UniqueConstraint("run_id", "dataset", "target_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("jira_sync_runs.id", ondelete="CASCADE"), index=True)
    dataset: Mapped[str] = mapped_column(String(40))
    target_id: Mapped[str] = mapped_column(String(100), default="")
    cursor: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    lease_token: Mapped[str | None] = mapped_column(String(36), nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(String(120), nullable=True)
    records: Mapped[int] = mapped_column(Integer, default=0)
    pages: Mapped[int] = mapped_column(Integer, default=0)


class JiraSourceObject(Base):
    __tablename__ = "jira_source_objects"
    __table_args__ = (UniqueConstraint("binding_id", "kind", "source_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    binding_id: Mapped[str] = mapped_column(String(36), ForeignKey("jira_project_bindings.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(40))
    source_id: Mapped[str] = mapped_column(String(100))
    issue_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON)
    version: Mapped[str] = mapped_column(String(64))
    source_updated_at: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    seen_run_id: Mapped[str] = mapped_column(String(36))
    state: Mapped[str] = mapped_column(String(30), default="active")


class JiraSourceVersion(Base):
    __tablename__ = "jira_source_versions"
    __table_args__ = (UniqueConstraint("object_id", "version"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    object_id: Mapped[str] = mapped_column(String(36), ForeignKey("jira_source_objects.id", ondelete="CASCADE"), index=True)
    version: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
