from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional

from models.workspace_membership import WorkspaceMembership, WorkspaceRoleEnum
from models.team_membership import TeamMembership
from models.team import Team

async def assert_workspace_member(user_id: int, workspace_id: int, db: AsyncSession) -> WorkspaceMembership:
    """Ensure the user is a member of the given workspace."""
    result = await db.execute(
        select(WorkspaceMembership)
        .where(
            and_(
                WorkspaceMembership.user_id == user_id,
                WorkspaceMembership.workspace_id == workspace_id
            )
        )
    )
    membership = result.scalars().first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this workspace."
        )
    return membership

async def assert_admin(user_id: int, workspace_id: int, db: AsyncSession) -> WorkspaceMembership:
    """Ensure the user is an admin of the given workspace."""
    membership = await assert_workspace_member(user_id, workspace_id, db)
    if membership.role != WorkspaceRoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this action."
        )
    return membership

async def assert_team_member(user_id: int, team_id: int, db: AsyncSession) -> TeamMembership:
    """Ensure the user is a member of the given team."""
    result = await db.execute(
        select(TeamMembership)
        .where(
            and_(
                TeamMembership.user_id == user_id,
                TeamMembership.team_id == team_id
            )
        )
    )
    membership = result.scalars().first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this team."
        )
    return membership

async def get_team_workspace(team_id: int, db: AsyncSession) -> int:
    """Helper to get a team's workspace ID."""
    result = await db.execute(select(Team.workspace_id).where(Team.id == team_id))
    workspace_id = result.scalar()
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Team not found.")
    return workspace_id

async def assert_can_access_project(user_id: int, team_id: int, db: AsyncSession) -> None:
    """
    To access a project, user must:
    1. Be a member of the team the project belongs to.
    2. Be a member of the workspace the team belongs to.
    """
    workspace_id = await get_team_workspace(team_id, db)
    await assert_workspace_member(user_id, workspace_id, db)
    await assert_team_member(user_id, team_id, db)
