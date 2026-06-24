from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List

from api.deps import get_db, get_current_user
from models.user import User
from models.team import Team
from models.team_membership import TeamMembership
from schemas.team import TeamCreate, TeamResponse, TeamWithMembersResponse
from core.access import assert_workspace_member, assert_admin, assert_team_member

router = APIRouter()

@router.post("/{workspace_id}", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    workspace_id: int,
    team_in: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new team in a workspace.
    User must be an admin of the workspace.
    Creator is automatically added to the team.
    """
    await assert_admin(current_user.id, workspace_id, db)
    
    team = Team(
        name=team_in.name,
        description=team_in.description,
        workspace_id=workspace_id,
        is_default=team_in.is_default
    )
    db.add(team)
    await db.flush()
    
    # Auto add creator to team
    membership = TeamMembership(
        user_id=current_user.id,
        team_id=team.id
    )
    db.add(membership)
    
    await db.commit()
    await db.refresh(team)
    
    return team

@router.get("/workspace/{workspace_id}", response_model=List[TeamResponse])
async def list_workspace_teams(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all teams in a workspace.
    User must be a member of the workspace.
    """
    await assert_workspace_member(current_user.id, workspace_id, db)
    
    result = await db.execute(
        select(Team)
        .where(Team.workspace_id == workspace_id)
    )
    teams = result.scalars().all()
    return teams

@router.get("/{team_id}", response_model=TeamWithMembersResponse)
async def get_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific team, including members.
    User must be a member of the team.
    """
    await assert_team_member(current_user.id, team_id, db)
    
    result = await db.execute(
        select(Team)
        .options(selectinload(Team.memberships))
        .where(Team.id == team_id)
    )
    team = result.scalar_one_or_none()
    if not team:
         raise HTTPException(status_code=404, detail="Team not found")
         
    return team

@router.post("/{team_id}/members/{user_id}", response_model=TeamWithMembersResponse)
async def add_team_member(
    team_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a user to a team.
    Current user must be an admin of the parent workspace.
    """
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    await assert_admin(current_user.id, team.workspace_id, db)
    
    # Check if user is a workspace member first
    from models.workspace_membership import WorkspaceMembership
    ws_mem_result = await db.execute(
        select(WorkspaceMembership)
        .where(
            and_(
                WorkspaceMembership.user_id == user_id,
                WorkspaceMembership.workspace_id == team.workspace_id
            )
        )
    )
    if not ws_mem_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be a member of the workspace first."
        )
        
    # Check if membership already exists
    mem_result = await db.execute(
        select(TeamMembership)
        .where(
            and_(
                TeamMembership.user_id == user_id,
                TeamMembership.team_id == team_id
            )
        )
    )
    existing_mem = mem_result.scalar_one_or_none()
    if existing_mem:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team."
        )
        
    membership = TeamMembership(
        user_id=user_id,
        team_id=team_id
    )
    db.add(membership)
    await db.commit()
    
    result = await db.execute(
        select(Team)
        .options(selectinload(Team.memberships))
        .where(Team.id == team_id)
    )
    return result.scalar_one()

@router.delete("/{team_id}/members/{user_id}", response_model=TeamWithMembersResponse)
async def remove_team_member(
    team_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a user from a team.
    Current user must be an admin of the parent workspace.
    """
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    await assert_admin(current_user.id, team.workspace_id, db)
    
    mem_result = await db.execute(
        select(TeamMembership)
        .where(
            and_(
                TeamMembership.user_id == user_id,
                TeamMembership.team_id == team_id
            )
        )
    )
    membership = mem_result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Team membership not found")
        
    await db.delete(membership)
    await db.commit()
    
    result = await db.execute(
        select(Team)
        .options(selectinload(Team.memberships))
        .where(Team.id == team_id)
    )
    return result.scalar_one()
