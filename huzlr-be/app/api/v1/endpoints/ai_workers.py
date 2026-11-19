"""AI Worker registry, lifecycle, durable executions, approvals, and node transport."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.access import assert_can_access_project
from core.config import settings
from core.database import get_db
from models.ai_worker import AIWorker, AIWorkerApproval, AIWorkerEvent, AIWorkerExecution, AIWorkerNode, utcnow
from models.issue import Issue
from models.project import Project
from models.user import User
from services.ai_worker_runtime import MUTATING_TOOLS, TERMINAL_STATUSES, TOOL_DESCRIPTIONS, add_event, execute_tool


router = APIRouter()


class WorkerCreate(BaseModel):
    project_id: int
    name: str = Field(min_length=1, max_length=120)
    instructions: str = Field(min_length=1, max_length=20000)
    model_provider: Literal["gemini", "openai", "openai_compatible", "test"] = "gemini"
    model_name: str = Field(min_length=1, max_length=120)
    deployment_kind: Literal["cloud", "customer_hosted"] = "cloud"
    allowed_tools: list[str] = Field(default_factory=list, max_length=20)
    max_steps: int = Field(default=12, ge=1, le=100)
    max_cost_cents: int = Field(default=100, ge=1, le=100000)

    @model_validator(mode="after")
    def validate_tools(self):
        unknown = sorted(set(self.allowed_tools) - set(TOOL_DESCRIPTIONS))
        if unknown:
            raise ValueError(f"Unknown tools: {', '.join(unknown)}")
        self.allowed_tools = sorted(set(self.allowed_tools))
        return self


class WorkerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    instructions: str | None = Field(default=None, min_length=1, max_length=20000)
    model_provider: Literal["gemini", "openai", "openai_compatible", "test"] | None = None
    model_name: str | None = Field(default=None, min_length=1, max_length=120)
    deployment_kind: Literal["cloud", "customer_hosted"] | None = None
    allowed_tools: list[str] | None = Field(default=None, max_length=20)
    max_steps: int | None = Field(default=None, ge=1, le=100)
    max_cost_cents: int | None = Field(default=None, ge=1, le=100000)

    @model_validator(mode="after")
    def validate_tools(self):
        if self.allowed_tools is not None:
            unknown = sorted(set(self.allowed_tools) - set(TOOL_DESCRIPTIONS))
            if unknown:
                raise ValueError(f"Unknown tools: {', '.join(unknown)}")
            self.allowed_tools = sorted(set(self.allowed_tools))
        return self


class WorkerView(WorkerCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    status: str
    version: int
    created_at: datetime
    updated_at: datetime


class ExecutionCreate(BaseModel):
    task_id: int | None = None
    task_description: str | None = Field(default=None, max_length=50000)
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=120)

    @model_validator(mode="after")
    def require_task(self):
        if self.task_id is None and not (self.task_description or "").strip():
            raise ValueError("task_id or task_description is required")
        return self


class EventView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_type: str
    payload: dict[str, Any]
    created_at: datetime


class ApprovalView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tool_name: str
    arguments: dict[str, Any]
    status: str
    requested_at: datetime
    decided_at: datetime | None
    decision_note: str | None


class ExecutionView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    worker_id: str
    task_id: int | None
    task_description: str
    worker_version: int
    deployment_kind: str
    status: str
    attempt: int
    max_attempts: int
    result: dict[str, Any] | None
    usage: dict[str, Any] | None
    error: str | None
    cancel_requested: bool
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    events: list[EventView] = Field(default_factory=list)
    approvals: list[ApprovalView] = Field(default_factory=list)


class ExecutionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    worker_id: str
    task_id: int | None
    task_description: str
    status: str
    result: dict[str, Any] | None
    error: str | None
    created_at: datetime
    updated_at: datetime


class ApprovalDecision(BaseModel):
    decision: Literal["approved", "rejected"]
    note: str | None = Field(default=None, max_length=2000)


class NodeCreate(BaseModel):
    project_id: int
    name: str = Field(min_length=1, max_length=120)


class NodeView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: int
    name: str
    status: str
    last_seen_at: datetime | None
    created_at: datetime


class NodeCreated(NodeView):
    token: str


class NodeEvent(BaseModel):
    event_type: str = Field(min_length=1, max_length=80)
    payload: dict[str, Any] = Field(default_factory=dict)


class NodeExecutionResult(BaseModel):
    status: Literal["completed", "failed", "cancelled"]
    result: dict[str, Any] | None = None
    error: str | None = Field(default=None, max_length=4000)
    usage: dict[str, Any] | None = None
    events: list[NodeEvent] = Field(default_factory=list, max_length=200)


class NodeToolRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    arguments: dict[str, Any] = Field(default_factory=dict)
    approval_id: str | None = None


async def authorized_worker(worker_id: str, db: AsyncSession, user: User) -> AIWorker:
    worker = await db.get(AIWorker, worker_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    project = await db.get(Project, worker.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await assert_can_access_project(user.id, project.team_id, db)
    return worker


async def authorized_execution(worker_id: str, execution_id: str, db: AsyncSession, user: User) -> tuple[AIWorker, AIWorkerExecution]:
    worker = await authorized_worker(worker_id, db, user)
    execution = await db.get(AIWorkerExecution, execution_id)
    if execution is None or execution.worker_id != worker.id:
        raise HTTPException(status_code=404, detail="Execution not found")
    return worker, execution


def token_digest(token: str) -> str:
    return hashlib.sha256(f"{token}:{settings.AI_WORKER_NODE_TOKEN_PEPPER}".encode()).hexdigest()


async def authenticated_node(token: str, db: AsyncSession) -> AIWorkerNode:
    node = await db.scalar(select(AIWorkerNode).where(AIWorkerNode.token_digest == token_digest(token)))
    if node is None or node.status != "active":
        raise HTTPException(status_code=401, detail="Invalid or revoked worker node token")
    node.last_seen_at = utcnow()
    return node


@router.get("/tools")
async def tool_catalog():
    return [{"name": name, "description": description, "requires_approval": name == "update_task_status"} for name, description in TOOL_DESCRIPTIONS.items()]


# Node routes are declared before /{worker_id} so the static prefix cannot be
# consumed as a worker ID.
@router.get("/nodes/", response_model=list[NodeView])
async def list_nodes(project_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await assert_can_access_project(user.id, project.team_id, db)
    rows = await db.execute(select(AIWorkerNode).where(AIWorkerNode.project_id == project_id).order_by(AIWorkerNode.created_at.desc()))
    return list(rows.scalars().all())


@router.post("/nodes/", response_model=NodeCreated, status_code=status.HTTP_201_CREATED)
async def create_node(payload: NodeCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    project = await db.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await assert_can_access_project(user.id, project.team_id, db)
    raw_token = f"huzlr_node_{secrets.token_urlsafe(32)}"
    node = AIWorkerNode(project_id=payload.project_id, created_by=user.id, name=payload.name, token_digest=token_digest(raw_token))
    db.add(node)
    await db.commit()
    await db.refresh(node)
    view = NodeView.model_validate(node)
    return NodeCreated(**view.model_dump(), token=raw_token)


@router.delete("/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_node(node_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    node = await db.get(AIWorkerNode, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Worker node not found")
    project = await db.get(Project, node.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await assert_can_access_project(user.id, project.team_id, db)
    node.status = "revoked"
    await db.commit()


@router.post("/nodes/internal/claim")
async def claim_node_execution(
    x_worker_node_token: str = Header(alias="X-Worker-Node-Token"),
    db: AsyncSession = Depends(get_db),
):
    node = await authenticated_node(x_worker_node_token, db)
    now = utcnow()
    execution = await db.scalar(
        select(AIWorkerExecution)
        .join(AIWorker, AIWorker.id == AIWorkerExecution.worker_id)
        .where(AIWorkerExecution.deployment_kind == "customer_hosted")
        .where(AIWorker.project_id == node.project_id)
        .where(AIWorker.status == "deployed")
        .where(
            or_(
                (AIWorkerExecution.status == "queued") & (AIWorkerExecution.available_at <= now),
                (AIWorkerExecution.status == "running") & (AIWorkerExecution.lease_expires_at < now),
            )
        )
        .order_by(AIWorkerExecution.available_at, AIWorkerExecution.created_at)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    if execution is None:
        await db.commit()
        return {"execution": None}
    worker = await db.get(AIWorker, execution.worker_id)
    execution.status = "running"
    execution.lease_owner = f"node:{node.id}"
    execution.lease_expires_at = now + timedelta(seconds=settings.AI_WORKER_LEASE_SECONDS)
    execution.started_at = execution.started_at or now
    await add_event(db, execution.id, "execution.started", {"node_id": node.id})
    await db.commit()
    return {
        "execution": {
            "id": execution.id,
            "task_id": execution.task_id,
            "task_description": execution.task_description,
            "worker": {
                "id": worker.id,
                "name": worker.name,
                "instructions": worker.instructions,
                "model_provider": worker.model_provider,
                "model_name": worker.model_name,
                "allowed_tools": worker.allowed_tools,
                "max_steps": worker.max_steps,
                "max_cost_cents": worker.max_cost_cents,
                "version": execution.worker_version,
            },
            "lease_seconds": settings.AI_WORKER_LEASE_SECONDS,
        }
    }


@router.post("/nodes/internal/executions/{execution_id}/heartbeat")
async def node_heartbeat(
    execution_id: str,
    x_worker_node_token: str = Header(alias="X-Worker-Node-Token"),
    db: AsyncSession = Depends(get_db),
):
    node = await authenticated_node(x_worker_node_token, db)
    execution = await db.get(AIWorkerExecution, execution_id, with_for_update=True)
    if execution is None or execution.lease_owner != f"node:{node.id}" or execution.status not in {"running", "waiting_approval", "cancelled"}:
        raise HTTPException(status_code=409, detail="Execution lease is not owned by this node")
    if execution.status == "cancelled":
        await db.commit()
        return {"cancel_requested": True}
    execution.lease_expires_at = utcnow() + timedelta(seconds=settings.AI_WORKER_LEASE_SECONDS)
    await db.commit()
    return {"cancel_requested": execution.cancel_requested}


@router.post("/nodes/internal/executions/{execution_id}/tools")
async def node_tool_call(
    execution_id: str,
    payload: NodeToolRequest,
    x_worker_node_token: str = Header(alias="X-Worker-Node-Token"),
    db: AsyncSession = Depends(get_db),
):
    node = await authenticated_node(x_worker_node_token, db)
    execution = await db.get(AIWorkerExecution, execution_id, with_for_update=True)
    if execution is None or execution.lease_owner != f"node:{node.id}" or execution.status not in {"running", "waiting_approval"}:
        raise HTTPException(status_code=409, detail="Execution lease is not owned by this node")
    if execution.cancel_requested:
        raise HTTPException(status_code=409, detail="Execution cancellation requested")
    worker = await db.get(AIWorker, execution.worker_id)
    if worker is None or worker.project_id != node.project_id or payload.name not in set(worker.allowed_tools or []):
        raise HTTPException(status_code=403, detail="Tool is not authorized for this worker")
    arguments = dict(payload.arguments)
    if execution.task_id is not None and "task_id" not in arguments and payload.name in {"get_task", "update_task_status"}:
        arguments["task_id"] = execution.task_id
    if payload.name in MUTATING_TOOLS:
        if not payload.approval_id:
            approval = AIWorkerApproval(execution_id=execution.id, tool_name=payload.name, arguments=arguments)
            db.add(approval)
            await db.flush()
            execution.status = "waiting_approval"
            await add_event(db, execution.id, "approval.requested", {"approval_id": approval.id, "tool": payload.name, "arguments": arguments, "node_id": node.id})
            await db.commit()
            return {"status": "approval_required", "approval_id": approval.id}
        approval = await db.get(AIWorkerApproval, payload.approval_id)
        if approval is None or approval.execution_id != execution.id or approval.tool_name != payload.name or approval.arguments != arguments:
            raise HTTPException(status_code=404, detail="Matching approval not found")
        if approval.status == "pending":
            return {"status": "approval_required", "approval_id": approval.id}
        if approval.status != "approved":
            raise HTTPException(status_code=403, detail="Tool action was rejected")
    result = await execute_tool(db, worker, payload.name, arguments)
    await add_event(db, execution.id, "tool.completed", {"tool": payload.name, "result": result, "node_id": node.id})
    await db.commit()
    return {"status": "completed", "result": result}


@router.get("/nodes/internal/executions/{execution_id}/approvals/{approval_id}")
async def node_approval_status(
    execution_id: str,
    approval_id: str,
    x_worker_node_token: str = Header(alias="X-Worker-Node-Token"),
    db: AsyncSession = Depends(get_db),
):
    node = await authenticated_node(x_worker_node_token, db)
    execution = await db.get(AIWorkerExecution, execution_id)
    approval = await db.get(AIWorkerApproval, approval_id)
    if execution is None or approval is None or approval.execution_id != execution.id or execution.lease_owner != f"node:{node.id}":
        raise HTTPException(status_code=404, detail="Approval not found")
    await db.commit()
    return {"status": approval.status, "cancel_requested": execution.cancel_requested}


@router.post("/nodes/internal/executions/{execution_id}/result")
async def complete_node_execution(
    execution_id: str,
    payload: NodeExecutionResult,
    x_worker_node_token: str = Header(alias="X-Worker-Node-Token"),
    db: AsyncSession = Depends(get_db),
):
    node = await authenticated_node(x_worker_node_token, db)
    execution = await db.get(AIWorkerExecution, execution_id, with_for_update=True)
    if execution is None or execution.lease_owner != f"node:{node.id}" or execution.status not in {"running", "waiting_approval", "cancelled"}:
        raise HTTPException(status_code=409, detail="Execution lease is not owned by this node")
    if execution.status == "cancelled":
        execution.lease_owner = None
        execution.lease_expires_at = None
        await db.commit()
        return {"status": "cancelled"}
    for event in payload.events:
        await add_event(db, execution.id, event.event_type, event.payload)
    if payload.status == "failed" and not execution.cancel_requested and execution.attempt + 1 < execution.max_attempts:
        execution.attempt += 1
        execution.status = "queued"
        execution.error = payload.error
        execution.usage = payload.usage
        execution.available_at = utcnow() + timedelta(seconds=min(60, 2 ** execution.attempt))
        execution.lease_owner = None
        execution.lease_expires_at = None
        await add_event(db, execution.id, "execution.retry_scheduled", {"attempt": execution.attempt, "error": payload.error, "node_id": node.id})
        await db.commit()
        return {"status": execution.status}
    execution.status = "cancelled" if execution.cancel_requested else payload.status
    execution.result = payload.result
    execution.error = "Cancelled by user" if execution.cancel_requested else payload.error
    execution.usage = payload.usage
    execution.finished_at = utcnow()
    execution.lease_owner = None
    execution.lease_expires_at = None
    await add_event(db, execution.id, f"execution.{execution.status}", {"node_id": node.id})
    await db.commit()
    return {"status": execution.status}


@router.get("/", response_model=list[WorkerView])
async def list_workers(
    project_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await assert_can_access_project(user.id, project.team_id, db)
    result = await db.execute(select(AIWorker).where(AIWorker.project_id == project_id).order_by(AIWorker.created_at.desc()).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.post("/", response_model=WorkerView, status_code=status.HTTP_201_CREATED)
async def create_worker(payload: WorkerCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    project = await db.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await assert_can_access_project(user.id, project.team_id, db)
    worker = AIWorker(**payload.model_dump(), created_by=user.id, status="draft")
    db.add(worker)
    await db.commit()
    await db.refresh(worker)
    return worker


@router.get("/{worker_id}", response_model=WorkerView)
async def get_worker(worker_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await authorized_worker(worker_id, db, user)


@router.patch("/{worker_id}", response_model=WorkerView)
async def update_worker(worker_id: str, payload: WorkerUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    worker = await authorized_worker(worker_id, db, user)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return worker
    active_count = await db.scalar(
        select(func.count())
        .select_from(AIWorkerExecution)
        .where(AIWorkerExecution.worker_id == worker.id, AIWorkerExecution.status.in_(["queued", "running", "waiting_approval"]))
    )
    if active_count:
        raise HTTPException(status_code=409, detail="Wait for active executions to finish or cancel them before editing this worker")
    for key, value in updates.items():
        setattr(worker, key, value)
    worker.version += 1
    worker.status = "draft"
    await db.commit()
    await db.refresh(worker)
    return worker


@router.post("/{worker_id}/deploy", response_model=WorkerView)
async def deploy_worker(worker_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    worker = await authorized_worker(worker_id, db, user)
    if worker.deployment_kind == "cloud" and worker.model_provider == "gemini" and not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=409, detail="GEMINI_API_KEY is not configured for cloud execution")
    if worker.deployment_kind == "cloud" and worker.model_provider in {"openai", "openai_compatible"} and not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=409, detail="OPENAI_API_KEY is not configured for cloud execution")
    if worker.deployment_kind == "customer_hosted":
        node_count = await db.scalar(select(func.count()).select_from(AIWorkerNode).where(AIWorkerNode.project_id == worker.project_id, AIWorkerNode.status == "active"))
        if not node_count:
            raise HTTPException(status_code=409, detail="Enroll an active customer-hosted node before deploying this worker")
    worker.status = "deployed"
    await db.commit()
    await db.refresh(worker)
    return worker


@router.post("/{worker_id}/disable", response_model=WorkerView)
async def disable_worker(worker_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    worker = await authorized_worker(worker_id, db, user)
    worker.status = "disabled"
    active = (await db.execute(select(AIWorkerExecution).where(AIWorkerExecution.worker_id == worker.id, AIWorkerExecution.status.in_(["queued", "running", "waiting_approval"])))).scalars().all()
    for execution in active:
        execution.cancel_requested = True
        node_is_finishing = execution.deployment_kind == "customer_hosted" and execution.status == "waiting_approval"
        if execution.status != "running" and not node_is_finishing:
            execution.status = "cancelled"
            execution.error = "Worker disabled before execution completed"
            execution.finished_at = utcnow()
        await add_event(db, execution.id, "execution.cancel_requested", {"reason": "worker_disabled"})
    await db.commit()
    await db.refresh(worker)
    return worker


@router.get("/{worker_id}/executions", response_model=list[ExecutionSummary])
async def list_executions(
    worker_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await authorized_worker(worker_id, db, user)
    result = await db.execute(select(AIWorkerExecution).where(AIWorkerExecution.worker_id == worker_id).order_by(AIWorkerExecution.created_at.desc()).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.post("/{worker_id}/executions", response_model=ExecutionSummary, status_code=status.HTTP_202_ACCEPTED)
async def dispatch_execution(worker_id: str, payload: ExecutionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    worker = await authorized_worker(worker_id, db, user)
    if worker.status != "deployed":
        raise HTTPException(status_code=409, detail="Worker must be deployed before it can run")
    if payload.idempotency_key:
        existing = await db.scalar(select(AIWorkerExecution).where(AIWorkerExecution.worker_id == worker.id, AIWorkerExecution.idempotency_key == payload.idempotency_key))
        if existing:
            return existing
    active_count = await db.scalar(
        select(func.count())
        .select_from(AIWorkerExecution)
        .where(AIWorkerExecution.worker_id == worker.id, AIWorkerExecution.status.in_(["queued", "running", "waiting_approval"]))
    )
    if active_count >= settings.AI_WORKER_MAX_ACTIVE_PER_WORKER:
        raise HTTPException(status_code=429, detail="This worker has reached its active execution limit")
    description = (payload.task_description or "").strip()
    if payload.task_id is not None:
        issue = await db.get(Issue, payload.task_id)
        if issue is None or issue.project_id != worker.project_id:
            raise HTTPException(status_code=404, detail="Task not found in worker project")
        description = description or f"Work on Huzlr task #{issue.id}: {issue.title}\n\n{issue.description or ''}".strip()
    execution = AIWorkerExecution(
        worker_id=worker.id,
        requested_by=user.id,
        task_id=payload.task_id,
        task_description=description,
        worker_version=worker.version,
        deployment_kind=worker.deployment_kind,
        idempotency_key=payload.idempotency_key,
    )
    db.add(execution)
    await db.flush()
    await add_event(db, execution.id, "execution.queued", {"deployment_kind": worker.deployment_kind, "worker_version": worker.version})
    await db.commit()
    await db.refresh(execution)
    return execution


@router.get("/{worker_id}/executions/{execution_id}", response_model=ExecutionView)
async def get_execution(worker_id: str, execution_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    _, execution = await authorized_execution(worker_id, execution_id, db, user)
    events = (await db.execute(select(AIWorkerEvent).where(AIWorkerEvent.execution_id == execution.id).order_by(AIWorkerEvent.id))).scalars().all()
    approvals = (await db.execute(select(AIWorkerApproval).where(AIWorkerApproval.execution_id == execution.id).order_by(AIWorkerApproval.requested_at))).scalars().all()
    scalar_fields = {
        name: getattr(execution, name)
        for name in ExecutionView.model_fields
        if name not in {"events", "approvals"}
    }
    return ExecutionView(
        **scalar_fields,
        events=[EventView.model_validate(event) for event in events],
        approvals=[ApprovalView.model_validate(approval) for approval in approvals],
    )


@router.post("/{worker_id}/executions/{execution_id}/cancel", response_model=ExecutionSummary)
async def cancel_execution(worker_id: str, execution_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    _, execution = await authorized_execution(worker_id, execution_id, db, user)
    if execution.status in TERMINAL_STATUSES:
        return execution
    execution.cancel_requested = True
    node_is_finishing = execution.deployment_kind == "customer_hosted" and execution.status == "waiting_approval"
    if execution.status in {"queued", "waiting_approval"} and not node_is_finishing:
        execution.status = "cancelled"
        execution.finished_at = utcnow()
        execution.error = "Cancelled by user"
    await add_event(db, execution.id, "execution.cancel_requested", {"user_id": user.id})
    await db.commit()
    await db.refresh(execution)
    return execution


@router.post("/{worker_id}/executions/{execution_id}/approvals/{approval_id}", response_model=ApprovalView)
async def decide_approval(
    worker_id: str,
    execution_id: str,
    approval_id: str,
    payload: ApprovalDecision,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _, execution = await authorized_execution(worker_id, execution_id, db, user)
    approval = await db.get(AIWorkerApproval, approval_id, with_for_update=True)
    if approval is None or approval.execution_id != execution.id:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(status_code=409, detail="Approval has already been decided")
    if execution.status != "waiting_approval":
        raise HTTPException(status_code=409, detail="Execution is not waiting for approval")
    approval.status = payload.decision
    approval.decision_note = payload.note
    approval.decided_by = user.id
    approval.decided_at = utcnow()
    if execution.deployment_kind == "customer_hosted":
        execution.status = "running"
    else:
        execution.status = "queued"
        execution.available_at = utcnow()
    await add_event(db, execution.id, f"approval.{payload.decision}", {"approval_id": approval.id, "user_id": user.id, "note": payload.note})
    await db.commit()
    await db.refresh(approval)
    return approval
