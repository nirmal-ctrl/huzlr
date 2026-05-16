from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from datetime import datetime, timedelta, timezone

from api.deps import get_db, get_current_user
from models.user import User
from models.invite import Invite, InviteStatusEnum
from models.workspace import Workspace
from models.workspace_membership import WorkspaceMembership
from models.team import Team
from models.team_membership import TeamMembership
from schemas.invite import InviteCreate, InviteResponse, InviteAccept
from core.access import assert_admin

router = APIRouter()

@router.post("/", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
async def create_invite(
    invite_in: InviteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new invite for a workspace.
    User must be an admin of the workspace.
    """
    await assert_admin(current_user.id, invite_in.workspace_id, db)
    
    # Check if there is already a pending invite for this email and workspace
    result = await db.execute(
        select(Invite)
        .where(
            and_(
                Invite.email == invite_in.email,
                Invite.workspace_id == invite_in.workspace_id,
                Invite.status == InviteStatusEnum.PENDING
            )
        )
    )
    existing_invite = result.scalars().first()
    if existing_invite:
        raise HTTPException(status_code=400, detail="A pending invite already exists for this email in this workspace.")
    
    # Optionally: rate limiting logic here (e.g. check count in last hour)

    expires_at = datetime.utcnow() + timedelta(days=7) # 7 days expiry

    invite = Invite(
        email=invite_in.email,
        workspace_id=invite_in.workspace_id,
        role=invite_in.role,
        expires_at=expires_at
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    
    # TODO: Send email
    
    return invite

@router.get("/workspace/{workspace_id}", response_model=List[InviteResponse])
async def list_workspace_invites(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all pending invites for a workspace.
    User must be an admin.
    """
    await assert_admin(current_user.id, workspace_id, db)
    
    result = await db.execute(
        select(Invite)
        .where(
            and_(
                Invite.workspace_id == workspace_id,
                Invite.status == InviteStatusEnum.PENDING
            )
        )
    )
    invites = result.scalars().all()
    return invites

@router.post("/accept", status_code=status.HTTP_200_OK)
async def accept_invite(
    accept_in: InviteAccept,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Accept an invite.
    """
    result = await db.execute(
        select(Invite)
        .where(Invite.id == accept_in.invite_id)
    )
    invite = result.scalars().first()
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
        
    if invite.status != InviteStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail=f"Invite is already {invite.status.value}")
        
    # Check expiry
    # Note: Using naive datetimes for now, ensure timezone consistency if possible.
    # The datetime.utcnow() returns naive datetime, comparing with DB which might be aware or naive.
    # We used datetime.utcnow() everywhere so they should be naive and compatible.
    if datetime.utcnow() > invite.expires_at:
        invite.status = InviteStatusEnum.EXPIRED
        await db.commit()
        raise HTTPException(status_code=400, detail="This invite has expired")
        
    # Validate email match
    if invite.email != current_user.email:
        raise HTTPException(status_code=403, detail="This invite was sent to a different email")
        
    # Check if already a member
    mem_result = await db.execute(
        select(WorkspaceMembership)
        .where(
            and_(
                WorkspaceMembership.user_id == current_user.id,
                WorkspaceMembership.workspace_id == invite.workspace_id
            )
        )
    )
    if mem_result.scalars().first():
        # Already member, just mark invite accepted and return
        invite.status = InviteStatusEnum.ACCEPTED
        await db.commit()
        return {"detail": "You are already a member of this workspace. Invite marked as accepted."}

    # Add to workspace
    workspace_membership = WorkspaceMembership(
        user_id=current_user.id,
        workspace_id=invite.workspace_id,
        role=invite.role
    )
    db.add(workspace_membership)
    
    # Auto-add to 'General' team
    team_result = await db.execute(
        select(Team)
        .where(
            and_(
                Team.workspace_id == invite.workspace_id,
                Team.is_default == True,
                Team.name == 'General'
            )
        )
    )
    general_team = team_result.scalars().first()
    
    if general_team:
        team_membership = TeamMembership(
            user_id=current_user.id,
            team_id=general_team.id
        )
        db.add(team_membership)
    
    # Mark invite accepted
    invite.status = InviteStatusEnum.ACCEPTED
    
    await db.commit()
    
    return {"detail": "Successfully joined workspace."}
