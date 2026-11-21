"""Validated worker definitions and execution state contracts."""
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, ConfigDict


class DeploymentKind(str, Enum):
    CLOUD = "cloud"


class WorkerStatus(str, Enum):
    DRAFT = "draft"
    DEPLOYED = "deployed"
    DISABLED = "disabled"


class ExecutionStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WorkerDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID = Field(default_factory=uuid4)
    organization_id: UUID
    project_id: UUID | None = None
    name: str = Field(min_length=1, max_length=120)
    instructions: str = Field(min_length=1, max_length=20000)
    model_provider: str = Field(min_length=1, max_length=80)
    model_name: str = Field(min_length=1, max_length=120)
    deployment_kind: DeploymentKind = DeploymentKind.CLOUD
    allowed_tools: list[str] = Field(default_factory=list)
    max_steps: int = Field(default=12, ge=1, le=100)
    status: WorkerStatus = WorkerStatus.DRAFT
    version: int = Field(default=1, ge=1)


class ExecutionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID = Field(default_factory=uuid4)
    organization_id: UUID
    worker_id: UUID
    worker_version: int = Field(ge=1)
    task_id: UUID | None = None
    status: ExecutionStatus = ExecutionStatus.QUEUED
    attempt: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    result: dict[str, Any] | None = None
    error: str | None = None
