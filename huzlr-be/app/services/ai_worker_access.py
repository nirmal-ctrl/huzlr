"""Project access for a single worker execution; never inferred from model arguments."""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.access import assert_can_access_project
from models.ai_worker import AIWorker
from models.project import Project
from models.team import Team


async def authorize_run_project(worker: AIWorker, project_id: int, user_id: int, db: AsyncSession) -> Project:
    if worker.project_id is not None and project_id != worker.project_id:
        raise HTTPException(404, "Project not available to this worker")
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    team = await db.get(Team, project.team_id)
    if team is None or team.deleted_at is not None:
        raise HTTPException(404, "Project not found")
    if worker.workspace_id is not None and team.workspace_id != worker.workspace_id:
        raise HTTPException(404, "Project not available in this worker’s workspace")
    await assert_can_access_project(user_id, project.team_id, db)
    return project
