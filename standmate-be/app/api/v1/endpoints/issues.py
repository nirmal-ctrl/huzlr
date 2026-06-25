from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from core.database import get_db
from models.issue import Issue
from models.project import Project
from models.team_membership import TeamMembership
from schemas.issue import IssueResponse, IssueCreate, IssueUpdate
from models.user import User
from api.deps import get_current_user
from core.access import assert_can_access_project

router = APIRouter()

@router.get("/", response_model=list[IssueResponse])
async def get_all_issues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all issues (including subtasks) for all projects owned/accessed by the current user."""
    # Eagerly load subtasks recursively up to 3 levels for convenience
    result = await db.execute(
        select(Issue)
        .options(
            selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue.subtasks)
        )
        .join(Project, Issue.project_id == Project.project_id)
        .join(TeamMembership, TeamMembership.team_id == Project.team_id)
        .where(TeamMembership.user_id == current_user.id)
        .where(Issue.parent_id == None)  # Only top level issues at root
        .order_by(Issue.order_index)
    )
    issues = result.scalars().all()
    return issues

@router.get("/project/{project_id}", response_model=list[IssueResponse])
async def list_project_issues(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify project exists and user has access
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await assert_can_access_project(current_user.id, project.team_id, db)

    result = await db.execute(
        select(Issue)
        .options(
            selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue.subtasks)
        )
        .where(Issue.project_id == project_id)
        .where(Issue.parent_id == None)  # Only top level issues at root
        .order_by(Issue.order_index)
    )
    issues = result.scalars().all()
    return issues

@router.get("/team/{team_id}", response_model=list[IssueResponse])
async def list_team_issues(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all issues for all projects belonging to a specific team owned/accessed by the current user."""
    result = await db.execute(
        select(Issue)
        .options(
            selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue.subtasks)
        )
        .join(Project, Issue.project_id == Project.project_id)
        .join(TeamMembership, TeamMembership.team_id == Project.team_id)
        .where(Project.team_id == team_id)
        .where(TeamMembership.user_id == current_user.id)
        .where(Issue.parent_id == None)  # Only top level issues at root
        .order_by(Issue.order_index)
    )
    issues = result.scalars().all()
    return issues

@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Issue)
        .options(
            selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue.subtasks)
        )
        .where(Issue.id == issue_id)
    )
    db_issue = result.scalars().first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    result = await db.execute(select(Project).where(Project.project_id == db_issue.project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await assert_can_access_project(current_user.id, project.team_id, db)
    return db_issue

@router.post("/project/{project_id}", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_project_issue(
    project_id: int,
    issue: IssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if issue.project_id != project_id:
        raise HTTPException(status_code=400, detail="Project ID in path does not match payload")

    # Verify project exists and user has access
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await assert_can_access_project(current_user.id, project.team_id, db)

    issue_data = issue.model_dump()
    properties = issue_data.pop("properties", None)
    
    db_issue = Issue(**issue_data)
    if properties is not None:
        db_issue.properties = properties
        
    db.add(db_issue)
    await db.commit()
    await db.refresh(db_issue)
    
    # Refresh to ensure relationships are loaded
    result = await db.execute(
        select(Issue)
        .options(
            selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue.subtasks)
        )
        .where(Issue.id == db_issue.id)
    )
    db_issue = result.scalars().first()
    return db_issue

@router.put("/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: int,
    issue_update: IssueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Issue)
        .options(selectinload(Issue._property_record))
        .where(Issue.id == issue_id)
    )
    db_issue = result.scalars().first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Verify user owns/accesses the project this issue belongs to
    result = await db.execute(select(Project).where(Project.project_id == db_issue.project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await assert_can_access_project(current_user.id, project.team_id, db)

    update_data = issue_update.model_dump(exclude_unset=True)
    properties = update_data.pop("properties", None)
    
    for key, value in update_data.items():
        setattr(db_issue, key, value)

    if properties is not None:
        db_issue.properties = properties
        if db_issue._property_record:
            flag_modified(db_issue._property_record, "data")

    await db.commit()
    await db.refresh(db_issue)
    
    result = await db.execute(
        select(Issue)
        .options(
            selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue._property_record),
            selectinload(Issue.subtasks).selectinload(Issue.subtasks).selectinload(Issue.subtasks)
        )
        .where(Issue.id == db_issue.id)
    )
    return result.scalars().first()

@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    db_issue = result.scalars().first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Verify user owns/accesses the project
    result = await db.execute(select(Project).where(Project.project_id == db_issue.project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await assert_can_access_project(current_user.id, project.team_id, db)

    await db.delete(db_issue)
    await db.commit()
    return None
