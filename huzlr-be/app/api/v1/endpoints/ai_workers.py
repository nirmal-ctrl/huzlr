"""Cloud AI Worker registry, lifecycle, durable executions, and approvals."""

from __future__ import annotations

from datetime import datetime
import base64
import json
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import and_, func, or_, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.deps import get_current_user
from core.access import assert_can_access_project, assert_workspace_member
from core.config import settings
from core.database import get_db
from models.ai_worker import (AIWorker, AIWorkerApproval, AIWorkerEvent, AIWorkerExecution,
                              AIWorkerSession, AIWorkerSessionMessage, utcnow)
from models.issue import Issue
from models.project import Project
from models.user import User
from models.team import Team
from models.team_membership import TeamMembership
from services.ai_worker_runtime import TERMINAL_STATUSES, TOOL_DESCRIPTIONS, MUTATING_TOOLS, add_event
from services.ai_worker_sandbox import SANDBOX_TOOLS, sandbox_available
from services.ai_worker_creation import CreationMessage, CreationReply, CreationUnavailable, creation_available, draft_worker_configuration
from services.ai_worker_access import authorize_run_project


router = APIRouter()


class WorkerScope(BaseModel):
    workspace_id: int | None = Field(default=None, gt=0)
    project_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def require_scope(self):
        if self.workspace_id is None and self.project_id is None:
            raise ValueError("A workspace is required")
        return self


class WorkerCreate(WorkerScope):
    name: str = Field(min_length=1, max_length=120)
    instructions: str = Field(min_length=1, max_length=20000)
    model_provider: Literal["gemini", "openai", "openai_compatible", "test"] = "gemini"
    model_name: str = Field(min_length=1, max_length=120)
    deployment_kind: Literal["cloud"] = "cloud"
    allowed_tools: list[str] = Field(default_factory=list, max_length=20)
    max_steps: int = Field(default=12, ge=1, le=100)
    max_cost_cents: int = Field(default=100, ge=1, le=100000)
    sandbox_mode: Literal["off", "docker"] = "off"
    max_runtime_seconds: int = Field(default=600, ge=30, le=1800)

    @model_validator(mode="after")
    def validate_tools(self):
        unknown = sorted(set(self.allowed_tools) - set(TOOL_DESCRIPTIONS))
        if unknown:
            raise ValueError(f"Unknown tools: {', '.join(unknown)}")
        self.allowed_tools = sorted(set(self.allowed_tools))
        if SANDBOX_TOOLS.intersection(self.allowed_tools) and self.sandbox_mode != "docker":
            raise ValueError("Workspace tools require a managed Docker sandbox")
        return self


class WorkerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    instructions: str | None = Field(default=None, min_length=1, max_length=20000)
    model_provider: Literal["gemini", "openai", "openai_compatible", "test"] | None = None
    model_name: str | None = Field(default=None, min_length=1, max_length=120)
    deployment_kind: Literal["cloud"] = "cloud"
    allowed_tools: list[str] | None = Field(default=None, max_length=20)
    max_steps: int | None = Field(default=None, ge=1, le=100)
    max_cost_cents: int | None = Field(default=None, ge=1, le=100000)
    sandbox_mode: Literal["off", "docker"] | None = None
    max_runtime_seconds: int | None = Field(default=None, ge=30, le=1800)

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


class WorkerChatRequest(WorkerScope):
    messages: list[CreationMessage] = Field(min_length=1, max_length=20)
    current_configuration: WorkerUpdate = Field(default_factory=WorkerUpdate)

    @model_validator(mode="after")
    def latest_turn_is_user(self):
        if self.messages[-1].role != "user" or not self.messages[-1].content.strip():
            raise ValueError("The latest message must contain a user request")
        return self


class ExecutionCreate(BaseModel):
    project_id: int | None = Field(default=None, gt=0)
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
    project_id: int | None = None
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
    artifacts: list[str] = Field(default_factory=list)


class ExecutionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    worker_id: str
    project_id: int | None = None
    task_id: int | None
    task_description: str
    status: str
    result: dict[str, Any] | None
    error: str | None
    created_at: datetime
    updated_at: datetime


class WorkerFeedItem(WorkerView):
    project_name: str | None = None


class WorkerFeed(BaseModel):
    items: list[WorkerFeedItem]
    next_cursor: str | None


class ExecutionFeed(BaseModel):
    items: list[ExecutionSummary]
    next_cursor: str | None


class SessionCreate(BaseModel):
    worker_id: str = Field(min_length=1, max_length=36)


class SessionMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=50000)
    project_id: int | None = Field(default=None, gt=0)


class SessionListItem(BaseModel):
    id: str
    worker_id: str
    worker_name: str
    worker_status: str
    title: str
    created_at: datetime
    updated_at: datetime


class SessionMessageView(BaseModel):
    id: str
    role: str
    content: str
    execution_id: str | None
    execution_status: str | None = None
    execution_error: str | None = None
    created_at: datetime


class SessionDetail(SessionListItem):
    messages: list[SessionMessageView]


def encode_cursor(row, scope: str) -> str:
    return base64.urlsafe_b64encode(json.dumps([scope, row.created_at.isoformat(), row.id]).encode()).decode()


def decode_cursor(cursor: str, scope: str) -> tuple[datetime, str]:
    try:
        cursor_scope, created_at, row_id = json.loads(base64.b64decode(cursor, altchars=b"-_", validate=True))
        timestamp = datetime.fromisoformat(created_at)
        if cursor_scope != scope or timestamp.tzinfo is None or not isinstance(row_id, str) or not 1 <= len(row_id) <= 36:
            raise ValueError()
        return timestamp, row_id
    except (ValueError, TypeError, KeyError, UnicodeError):
        raise HTTPException(status_code=422, detail="Invalid pagination cursor")


class ApprovalDecision(BaseModel):
    decision: Literal["approved", "rejected"]
    note: str | None = Field(default=None, max_length=2000)


async def authorized_worker(worker_id: str, db: AsyncSession, user: User) -> AIWorker:
    worker = await db.get(AIWorker, worker_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    if worker.deployment_kind != "cloud":
        raise HTTPException(status_code=410, detail="This deployment type has been retired; create a new cloud worker")
    if worker.project_id is not None:
        await authorize_run_project(worker, worker.project_id, user.id, db)
    else:
        await assert_workspace_member(user.id, worker.workspace_id, db)
    return worker


async def authorized_execution(worker_id: str, execution_id: str, db: AsyncSession, user: User) -> tuple[AIWorker, AIWorkerExecution]:
    worker = await authorized_worker(worker_id, db, user)
    execution = await db.get(AIWorkerExecution, execution_id)
    if execution is None or execution.worker_id != worker.id:
        raise HTTPException(status_code=404, detail="Execution not found")
    if execution.project_id is not None:
        await authorize_run_project(worker, execution.project_id, user.id, db)
    return worker, execution


async def authorize_creation_scope(payload: WorkerScope, db: AsyncSession, user: User):
    if payload.workspace_id is not None:
        await assert_workspace_member(user.id, payload.workspace_id, db)
    if payload.project_id is not None:
        # Keep existing project-scoped API clients working without widening access.
        await authorize_run_project(payload, payload.project_id, user.id, db)


async def worker_workspace_id(worker: AIWorker, db: AsyncSession) -> int:
    if worker.workspace_id is not None:
        return worker.workspace_id
    project = await db.get(Project, worker.project_id)
    team = await db.get(Team, project.team_id) if project else None
    if team is None or team.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Worker workspace not found")
    return team.workspace_id


async def authorized_session(session_id: str, db: AsyncSession, user: User) -> tuple[AIWorkerSession, AIWorker]:
    session = await db.get(AIWorkerSession, session_id)
    if session is None or session.created_by != user.id:
        raise HTTPException(status_code=404, detail="Chat session not found")
    worker = await authorized_worker(session.worker_id, db, user)
    if await worker_workspace_id(worker, db) != session.workspace_id:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session, worker


async def session_detail(session: AIWorkerSession, worker: AIWorker, db: AsyncSession) -> SessionDetail:
    messages = list((await db.execute(select(AIWorkerSessionMessage).where(
        AIWorkerSessionMessage.session_id == session.id).order_by(
        AIWorkerSessionMessage.created_at, AIWorkerSessionMessage.id))).scalars().all())
    execution_ids = {message.execution_id for message in messages if message.execution_id}
    executions = list((await db.execute(select(AIWorkerExecution).where(
        AIWorkerExecution.id.in_(execution_ids)))).scalars().all()) if execution_ids else []
    by_id = {execution.id: execution for execution in executions}
    return SessionDetail(
        id=session.id, worker_id=worker.id, worker_name=worker.name,
        worker_status=worker.status, title=session.title,
        created_at=session.created_at, updated_at=session.updated_at,
        messages=[SessionMessageView(
            id=message.id, role=message.role, content=message.content,
            execution_id=message.execution_id,
            execution_status=by_id.get(message.execution_id).status if message.execution_id in by_id else None,
            execution_error=by_id.get(message.execution_id).error if message.execution_id in by_id else None,
            created_at=message.created_at) for message in messages])


def accessible_executions(worker_id: str, user_id: int):
    projects = select(Project.project_id).join(Team, Team.id == Project.team_id).join(
        TeamMembership, TeamMembership.team_id == Team.id).where(
        TeamMembership.user_id == user_id, Team.deleted_at.is_(None))
    return select(AIWorkerExecution).where(AIWorkerExecution.worker_id == worker_id, or_(
        AIWorkerExecution.project_id.is_(None), AIWorkerExecution.project_id.in_(projects)))


@router.get("/tools")
async def tool_catalog():
    return [{"name": name, "description": description, "requires_approval": name in MUTATING_TOOLS,
             "requires_sandbox": name in SANDBOX_TOOLS} for name, description in TOOL_DESCRIPTIONS.items()]


@router.get("/capabilities")
async def capabilities():
    return {"managed_sandbox": await sandbox_available(), "network_access": False,
            "creation_chat": creation_available(),
            "workspace_limit_bytes": 1048576, "command_timeout_seconds": 30}


@router.post("/draft", response_model=CreationReply)
async def draft_worker(payload: WorkerChatRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await authorize_creation_scope(payload, db, user)
    # The model call is read-only and does not need to hold a database connection.
    await db.rollback()
    try:
        return await draft_worker_configuration(payload.messages, payload.current_configuration.model_dump(exclude_none=True))
    except CreationUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="The creation assistant took too long. Please try again.") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The creation assistant could not prepare a valid draft. Please try again.") from exc


@router.get("/feed", response_model=WorkerFeed)
async def worker_feed(workspace_id: int, cursor: str | None = Query(default=None, max_length=512),
                      limit: int = Query(default=12, ge=1, le=50),
                      db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await assert_workspace_member(user.id, workspace_id, db)
    scope = f"workers:{workspace_id}"
    accessible_projects = select(Project.project_id).join(Team, Team.id == Project.team_id).join(
        TeamMembership, TeamMembership.team_id == Team.id).where(
        Team.workspace_id == workspace_id, TeamMembership.user_id == user.id, Team.deleted_at.is_(None))
    query = select(AIWorker).where(AIWorker.deployment_kind == "cloud", or_(
        and_(AIWorker.workspace_id == workspace_id, AIWorker.project_id.is_(None)),
        AIWorker.project_id.in_(accessible_projects)))
    if cursor:
        query = query.where(tuple_(AIWorker.created_at, AIWorker.id) < decode_cursor(cursor, scope))
    rows = list((await db.execute(query.order_by(AIWorker.created_at.desc(), AIWorker.id.desc()).limit(limit + 1))).scalars().all())
    page = rows[:limit]
    project_ids = {row.project_id for row in page if row.project_id is not None}
    projects = (await db.execute(select(Project).options(selectinload(Project._property_record)).where(Project.project_id.in_(project_ids)))).scalars().all() if project_ids else []
    names = {project.project_id: (project.properties.get("project_title") or project.properties.get("title") or f"Project {project.project_id}") for project in projects}
    return WorkerFeed(items=[WorkerFeedItem(**WorkerView.model_validate(row).model_dump(), project_name=names.get(row.project_id)) for row in page],
                      next_cursor=encode_cursor(page[-1], scope) if len(rows) > limit else None)


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
    result = await db.execute(select(AIWorker).where(AIWorker.project_id == project_id, AIWorker.deployment_kind == "cloud").order_by(AIWorker.created_at.desc()).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.post("/", response_model=WorkerView, status_code=status.HTTP_201_CREATED)
async def create_worker(payload: WorkerCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await authorize_creation_scope(payload, db, user)
    worker = AIWorker(**payload.model_dump(), created_by=user.id, status="draft")
    db.add(worker)
    await db.commit()
    await db.refresh(worker)
    return worker


@router.get("/sessions/", response_model=list[SessionListItem])
async def list_sessions(workspace_id: int, limit: int = Query(default=50, ge=1, le=100),
                        db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await assert_workspace_member(user.id, workspace_id, db)
    rows = (await db.execute(select(AIWorkerSession, AIWorker).join(
        AIWorker, AIWorker.id == AIWorkerSession.worker_id).where(
        AIWorkerSession.workspace_id == workspace_id,
        AIWorkerSession.created_by == user.id).order_by(
        AIWorkerSession.updated_at.desc()).limit(limit))).all()
    return [SessionListItem(
        id=session.id, worker_id=worker.id, worker_name=worker.name,
        worker_status=worker.status, title=session.title,
        created_at=session.created_at, updated_at=session.updated_at)
        for session, worker in rows]


@router.post("/sessions/", response_model=SessionDetail, status_code=status.HTTP_201_CREATED)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db),
                         user: User = Depends(get_current_user)):
    worker = await authorized_worker(payload.worker_id, db, user)
    workspace_id = await worker_workspace_id(worker, db)
    session = AIWorkerSession(workspace_id=workspace_id, worker_id=worker.id,
                              created_by=user.id, title="New chat")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return await session_detail(session, worker, db)


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db),
                      user: User = Depends(get_current_user)):
    session, worker = await authorized_session(session_id, db, user)
    return await session_detail(session, worker, db)


@router.post("/sessions/{session_id}/messages", response_model=SessionDetail,
             status_code=status.HTTP_202_ACCEPTED)
async def send_session_message(session_id: str, payload: SessionMessageCreate,
                               db: AsyncSession = Depends(get_db),
                               user: User = Depends(get_current_user)):
    session, worker = await authorized_session(session_id, db, user)
    if worker.status != "deployed":
        raise HTTPException(status_code=409, detail="Worker must be active before you can chat")
    session_active = await db.scalar(select(func.count()).select_from(AIWorkerExecution).where(
        AIWorkerExecution.session_id == session.id,
        AIWorkerExecution.status.in_(["queued", "running", "waiting_approval"])))
    if session_active:
        raise HTTPException(status_code=409, detail="Wait for the current reply before sending another message")
    active_count = await db.scalar(select(func.count()).select_from(AIWorkerExecution).where(
        AIWorkerExecution.worker_id == worker.id,
        AIWorkerExecution.status.in_(["queued", "running", "waiting_approval"])))
    if active_count >= settings.AI_WORKER_MAX_ACTIVE_PER_WORKER:
        raise HTTPException(status_code=429, detail="This worker has reached its active execution limit")
    project_id = payload.project_id if payload.project_id is not None else worker.project_id
    if project_id is not None:
        await authorize_run_project(worker, project_id, user.id, db)
    previous = list((await db.execute(select(AIWorkerSessionMessage).where(
        AIWorkerSessionMessage.session_id == session.id).order_by(
        AIWorkerSessionMessage.created_at.desc(), AIWorkerSessionMessage.id.desc()).limit(20))).scalars().all())
    conversation = [{"role": message.role, "content": message.content}
                    for message in reversed(previous)]
    content = payload.content.strip()
    execution = AIWorkerExecution(
        worker_id=worker.id, requested_by=user.id, project_id=project_id,
        session_id=session.id, conversation=conversation,
        task_description=content, worker_version=worker.version,
        deployment_kind=worker.deployment_kind)
    db.add(execution)
    await db.flush()
    db.add(AIWorkerSessionMessage(session_id=session.id, execution_id=execution.id,
                                  role="user", content=content))
    if session.title == "New chat":
        session.title = content[:157] + ("…" if len(content) > 157 else "")
    session.updated_at = utcnow()
    await add_event(db, execution.id, "execution.queued", {
        "deployment_kind": worker.deployment_kind, "worker_version": worker.version,
        "session_id": session.id})
    await db.commit()
    await db.refresh(session)
    return await session_detail(session, worker, db)


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
        if value is None:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")
    merged_mode = updates.get("sandbox_mode", worker.sandbox_mode)
    merged_tools = updates.get("allowed_tools", worker.allowed_tools)
    if SANDBOX_TOOLS.intersection(merged_tools) and merged_mode != "docker":
        raise HTTPException(status_code=422, detail="Workspace tools require a managed Docker sandbox")
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
    if worker.sandbox_mode == "docker" and not await sandbox_available():
        raise HTTPException(status_code=409, detail="Managed Docker sandbox is not available on the worker host")
    if worker.model_provider == "gemini" and not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=409, detail="GEMINI_API_KEY is not configured for cloud execution")
    if worker.model_provider in {"openai", "openai_compatible"} and not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=409, detail="OPENAI_API_KEY is not configured for cloud execution")
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
        if execution.status != "running":
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
    result = await db.execute(accessible_executions(worker_id, user.id).order_by(AIWorkerExecution.created_at.desc()).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.get("/{worker_id}/executions/feed", response_model=ExecutionFeed)
async def execution_feed(worker_id: str, cursor: str | None = Query(default=None, max_length=512),
                         limit: int = Query(default=20, ge=1, le=50),
                         db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await authorized_worker(worker_id, db, user)
    scope = f"executions:{worker_id}"
    query = accessible_executions(worker_id, user.id)
    if cursor:
        query = query.where(tuple_(AIWorkerExecution.created_at, AIWorkerExecution.id) < decode_cursor(cursor, scope))
    rows = list((await db.execute(query.order_by(AIWorkerExecution.created_at.desc(), AIWorkerExecution.id.desc()).limit(limit + 1))).scalars().all())
    page = rows[:limit]
    return ExecutionFeed(items=[ExecutionSummary.model_validate(row) for row in page],
                         next_cursor=encode_cursor(page[-1], scope) if len(rows) > limit else None)


@router.post("/{worker_id}/executions", response_model=ExecutionSummary, status_code=status.HTTP_202_ACCEPTED)
async def dispatch_execution(worker_id: str, payload: ExecutionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    worker = await authorized_worker(worker_id, db, user)
    if worker.status != "deployed":
        raise HTTPException(status_code=409, detail="Worker must be deployed before it can run")
    if payload.idempotency_key:
        existing = await db.scalar(select(AIWorkerExecution).where(AIWorkerExecution.worker_id == worker.id, AIWorkerExecution.idempotency_key == payload.idempotency_key))
        if existing:
            if existing.project_id is not None:
                await authorize_run_project(worker, existing.project_id, user.id, db)
            return existing
    active_count = await db.scalar(
        select(func.count())
        .select_from(AIWorkerExecution)
        .where(AIWorkerExecution.worker_id == worker.id, AIWorkerExecution.status.in_(["queued", "running", "waiting_approval"]))
    )
    if active_count >= settings.AI_WORKER_MAX_ACTIVE_PER_WORKER:
        raise HTTPException(status_code=429, detail="This worker has reached its active execution limit")
    description = (payload.task_description or "").strip()
    project_id = payload.project_id if payload.project_id is not None else worker.project_id
    if payload.task_id is not None:
        issue = await db.get(Issue, payload.task_id)
        if issue is None or (project_id is not None and issue.project_id != project_id):
            raise HTTPException(status_code=404, detail="Task not found in execution project")
        project_id = issue.project_id
        description = description or f"Work on Huzlr task #{issue.id}: {issue.title}\n\n{issue.description or ''}".strip()
    if project_id is not None:
        await authorize_run_project(worker, project_id, user.id, db)
    execution = AIWorkerExecution(
        worker_id=worker.id,
        requested_by=user.id,
        task_id=payload.task_id,
        project_id=project_id,
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
        if name not in {"events", "approvals", "artifacts"}
    }
    return ExecutionView(
        **scalar_fields,
        events=[EventView.model_validate(event) for event in events],
        approvals=[ApprovalView.model_validate(approval) for approval in approvals],
        artifacts=sorted((execution.environment or {}).get("files", {})),
    )


@router.get("/{worker_id}/executions/{execution_id}/artifact")
async def get_artifact(worker_id: str, execution_id: str, path: str = Query(max_length=1024),
                       db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    _, execution = await authorized_execution(worker_id, execution_id, db, user)
    files = (execution.environment or {}).get("files", {})
    if path not in files:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return {"path": path, "content_base64": files[path]}


@router.post("/{worker_id}/executions/{execution_id}/cancel", response_model=ExecutionSummary)
async def cancel_execution(worker_id: str, execution_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    _, execution = await authorized_execution(worker_id, execution_id, db, user)
    if execution.status in TERMINAL_STATUSES:
        return execution
    execution.cancel_requested = True
    if execution.status in {"queued", "waiting_approval"}:
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
    execution.status = "queued"
    execution.available_at = utcnow()
    await add_event(db, execution.id, f"approval.{payload.decision}", {"approval_id": approval.id, "user_id": user.id, "note": payload.note})
    await db.commit()
    await db.refresh(approval)
    return approval
