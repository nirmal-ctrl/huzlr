"""Authenticated AI worker registry. Execution dispatch remains disabled until safe runtime integration."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from api.deps import get_current_user
from core.access import assert_can_access_project
from core.database import get_db
from models.project import Project
from models.user import User
from models.ai_worker import AIWorker, AIWorkerExecution

router = APIRouter()


class WorkerCreate(BaseModel):
    project_id: int
    name: str = Field(min_length=1, max_length=120)
    instructions: str = Field(min_length=1, max_length=20000)
    model_provider: str = Field(min_length=1, max_length=80)
    model_name: str = Field(min_length=1, max_length=120)
    deployment_kind: Literal["cloud", "customer_hosted"] = "cloud"
    allowed_tools: list[str] = Field(default_factory=list)


class WorkerView(WorkerCreate):
    id: str
    status: str
    version: int
    model_config = {"from_attributes": True}


async def authorized_worker(worker_id: str, db: AsyncSession, user: User) -> AIWorker:
    worker = await db.get(AIWorker, worker_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    project = await db.get(Project, worker.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await assert_can_access_project(user.id, project.team_id, db)
    return worker


@router.get("/", response_model=list[WorkerView])
async def list_workers(project_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await assert_can_access_project(user.id, project.team_id, db)
    result = await db.execute(select(AIWorker).where(AIWorker.project_id == project_id))
    return list(result.scalars().all())


@router.post("/", response_model=WorkerView, status_code=status.HTTP_201_CREATED)
async def create_worker(payload: WorkerCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    project = await db.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await assert_can_access_project(user.id, project.team_id, db)
    worker = AIWorker(**payload.model_dump(), status="draft")
    db.add(worker)
    await db.commit()
    await db.refresh(worker)
    return worker


@router.get("/{worker_id}", response_model=WorkerView)
async def get_worker(worker_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await authorized_worker(worker_id, db, user)


@router.get("/{worker_id}/executions")
async def list_executions(worker_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await authorized_worker(worker_id, db, user)
    result = await db.execute(select(AIWorkerExecution).where(AIWorkerExecution.worker_id == worker_id))
    return [{"id": e.id, "status": e.status, "created_at": e.created_at.isoformat()} for e in result.scalars().all()]


@router.post("/{worker_id}/executions", status_code=503)
async def dispatch_execution(worker_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await authorized_worker(worker_id, db, user)
    raise HTTPException(status_code=503, detail="Execution dispatch unavailable until sandbox and queue are configured")
