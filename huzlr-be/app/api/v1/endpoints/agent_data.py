import hmac
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.deps import get_db
from core.config import settings
from models.issue import Issue
from models.milestone import Milestone
from models.project import Project
from models.project_document import ProjectDocument
from models.scrum_master import MeetingTranscriptSegment, ScrumMeeting
from models.team import Team
from models.team_membership import TeamMembership
from models.workspace import Workspace
from schemas.agent_data import (
    AgentDocumentResponse,
    AgentIssueResponse,
    AgentMilestoneResponse,
    AgentProjectResponse,
    AgentTeamResponse,
    AgentTranscriptCreate,
    AgentTranscriptResponse,
)


router = APIRouter()


def require_agent_service_key(
    x_huzlr_agent_key: Annotated[Optional[str], Header()] = None,
) -> None:
    configured = settings.AGENT_SERVICE_KEY
    if (
        not configured
        or not x_huzlr_agent_key
        or not hmac.compare_digest(x_huzlr_agent_key, configured)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid agent service key",
        )


async def _authorized_project(user_id: int, project_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project)
        .join(TeamMembership, TeamMembership.team_id == Project.team_id)
        .where(TeamMembership.user_id == user_id, Project.project_id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("/users/{user_id}/teams", response_model=list[AgentTeamResponse])
async def list_user_teams(
    user_id: int,
    _: None = Depends(require_agent_service_key),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team.id, Team.name, Team.workspace_id, Workspace.name.label("workspace_name"))
        .join(TeamMembership, TeamMembership.team_id == Team.id)
        .join(Workspace, Workspace.id == Team.workspace_id)
        .where(TeamMembership.user_id == user_id, Team.deleted_at.is_(None))
        .order_by(Workspace.name, Team.name)
    )
    return [AgentTeamResponse(**row._mapping) for row in result.all()]


@router.get("/users/{user_id}/projects", response_model=list[AgentProjectResponse])
async def list_user_projects(
    user_id: int,
    _: None = Depends(require_agent_service_key),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project._property_record))
        .join(TeamMembership, TeamMembership.team_id == Project.team_id)
        .where(TeamMembership.user_id == user_id)
        .order_by(Project.updated_at.desc())
    )
    return [
        AgentProjectResponse(
            id=project.project_id,
            title=project.properties.get("project_title") or f"Project {project.project_id}",
            path=f"/projects/{project.project_id}",
        )
        for project in result.scalars().all()
    ]


@router.get(
    "/users/{user_id}/projects/{project_id}/milestones",
    response_model=list[AgentMilestoneResponse],
)
async def list_project_milestones(
    user_id: int,
    project_id: int,
    _: None = Depends(require_agent_service_key),
    db: AsyncSession = Depends(get_db),
):
    await _authorized_project(user_id, project_id, db)
    result = await db.execute(
        select(Milestone)
        .where(Milestone.project_id == project_id)
        .order_by(Milestone.order_index, Milestone.milestone_id)
    )
    return [
        AgentMilestoneResponse(id=milestone.milestone_id, title=milestone.title)
        for milestone in result.scalars().all()
    ]


@router.get("/users/{user_id}/projects/{project_id}/issues", response_model=list[AgentIssueResponse])
async def list_project_issues(
    user_id: int,
    project_id: int,
    _: None = Depends(require_agent_service_key),
    db: AsyncSession = Depends(get_db),
):
    await _authorized_project(user_id, project_id, db)
    result = await db.execute(
        select(Issue).where(Issue.project_id == project_id).order_by(Issue.order_index, Issue.id)
    )
    return [
        AgentIssueResponse(id=issue.id, title=issue.title, status=issue.status)
        for issue in result.scalars().all()
    ]


@router.get("/users/{user_id}/projects/{project_id}/documents", response_model=list[AgentDocumentResponse])
async def list_project_documents(
    user_id: int,
    project_id: int,
    _: None = Depends(require_agent_service_key),
    db: AsyncSession = Depends(get_db),
):
    await _authorized_project(user_id, project_id, db)
    result = await db.execute(
        select(ProjectDocument)
        .where(ProjectDocument.project_id == project_id)
        .order_by(ProjectDocument.updated_at.desc())
    )
    return [
        AgentDocumentResponse(id=document.document_id, title=document.title)
        for document in result.scalars().all()
    ]


@router.post(
    "/meetings/{meeting_id}/transcripts",
    response_model=AgentTranscriptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_meeting_transcript(
    meeting_id: int,
    payload: AgentTranscriptCreate,
    _: None = Depends(require_agent_service_key),
    db: AsyncSession = Depends(get_db),
):
    meeting = await db.get(ScrumMeeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    segment = MeetingTranscriptSegment(meeting_id=meeting_id, **payload.model_dump())
    db.add(segment)
    await db.commit()
    await db.refresh(segment)
    return AgentTranscriptResponse(id=segment.id)
