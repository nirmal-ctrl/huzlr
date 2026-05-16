from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List

from api.deps import get_db, get_current_user
from models.user import User
from models.workspace import Workspace
from models.workspace_membership import WorkspaceMembership, WorkspaceRoleEnum
from models.team import Team
from models.team_membership import TeamMembership
from schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceWithMembersResponse
from core.access import assert_workspace_member, assert_admin

router = APIRouter()

@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_in: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new workspace.
    This also creates a default 'General' team and adds the user as an admin.
    """
    # 1. Create Workspace
    workspace = Workspace(
        name=workspace_in.name,
        owner_id=current_user.id,
        created_by=current_user.id
    )
    db.add(workspace)
    await db.flush() # flush to get workspace.id
    
    # 2. Create WorkspaceMembership (admin)
    membership = WorkspaceMembership(
        user_id=current_user.id,
        workspace_id=workspace.id,
        role=WorkspaceRoleEnum.ADMIN
    )
    db.add(membership)
    
    # 3. Create default team 'General'
    team = Team(
        name="General",
        workspace_id=workspace.id,
        is_default=True
    )
    db.add(team)
    await db.flush() # flush to get team.id
    
    # 4. Create TeamMembership
    team_membership = TeamMembership(
        user_id=current_user.id,
        team_id=team.id
    )
    db.add(team_membership)
    
    await db.commit()
    await db.refresh(workspace)
    
    return workspace

@router.get("/", response_model=List[WorkspaceResponse])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all workspaces the current user is a member of.
    """
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMembership)
        .where(WorkspaceMembership.user_id == current_user.id)
    )
    workspaces = result.scalars().all()
    return workspaces

from sqlalchemy.orm import selectinload

@router.get("/{workspace_id}", response_model=WorkspaceWithMembersResponse)
async def get_workspace(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific workspace, including members.
    User must be a member.
    """
    await assert_workspace_member(current_user.id, workspace_id, db)
    
    result = await db.execute(
        select(Workspace)
        .options(selectinload(Workspace.memberships))
        .where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
         raise HTTPException(status_code=404, detail="Workspace not found")
         
    return workspace
