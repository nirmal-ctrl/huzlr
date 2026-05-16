from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from models.property import Property
from core.database import get_db
from models.project import Project
from models.user import User
from models.team_membership import TeamMembership
from schemas.project import ProjectResponse, ProjectCreate, ProjectUpdate
from api.deps import get_current_user
from core.access import assert_can_access_project, assert_team_member

router = APIRouter()

@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    workspace_id: int | None = None,
    team_id: int | None = None,
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Project).options(selectinload(Project._property_record))
    
    if team_id:
        await assert_can_access_project(current_user.id, team_id, db)
        query = query.where(Project.team_id == team_id)
    elif workspace_id:
        # Filter projects by workspace via the Team model
        from models.team import Team
        query = (
            query.join(Team, Team.id == Project.team_id)
            .where(Team.workspace_id == workspace_id)
            .join(TeamMembership, TeamMembership.team_id == Team.id)
            .where(TeamMembership.user_id == current_user.id)
        )
    else:
        # If no team_id or workspace_id specified, list all projects across all teams the user belongs to
        query = (
            query.join(TeamMembership, TeamMembership.team_id == Project.team_id)
            .where(TeamMembership.user_id == current_user.id)
        )

    result = await db.execute(query.offset(skip).limit(limit))
    projects = result.scalars().all()
    return projects

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify user can access the team
    await assert_team_member(current_user.id, project.team_id, db)

    project_data = project.model_dump()
    
    if 'properties' in project_data and hasattr(project_data['properties'], 'model_dump'):
         project_data['properties'] = project_data['properties'].model_dump()
         
    properties_data = project_data.pop('properties', {})
    
    db_project = Project(**project_data)
            
    db.add(db_project)
    await db.flush()
    
    prop_record = Property(entity_type="project", entity_id=db_project.project_id, data=properties_data)
    db_project._property_record = prop_record
    
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project._property_record))
        .where(Project.project_id == project_id)
    )
    project = result.scalars().first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await assert_can_access_project(current_user.id, project.team_id, db)

    return project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int, 
    project_update: ProjectUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project._property_record))
        .where(Project.project_id == project_id)
    )
    db_project = result.scalars().first()
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await assert_can_access_project(current_user.id, db_project.team_id, db)
    
    update_data = project_update.model_dump(exclude_unset=True)
    
    if 'properties' in update_data:
        existing_props = dict(db_project.properties) if db_project.properties else {}
        new_props = update_data['properties']
        
        if hasattr(new_props, 'model_dump'):
            new_props = new_props.model_dump(exclude_unset=True)
            
        existing_props.update(new_props)
        
        if db_project._property_record:
            db_project._property_record.data = existing_props
            flag_modified(db_project._property_record, "data")
        else:
            db_project._property_record = Property(
                entity_type="project", 
                entity_id=db_project.project_id, 
                data=existing_props
            )
        
        del update_data['properties']

    for key, value in update_data.items():
        setattr(db_project, key, value)
        
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project._property_record))
        .where(Project.project_id == project_id)
    )
    project = result.scalars().first()
    
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
         
    await assert_can_access_project(current_user.id, project.team_id, db)
         
    await db.delete(project)
    await db.commit()
    return None

@router.post("/batch-delete", status_code=status.HTTP_204_NO_CONTENT)
async def batch_delete_projects(
    project_ids: list[int] = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project._property_record))
        .where(Project.project_id.in_(project_ids))
    )
    projects = result.scalars().all()
    
    for project in projects:
        # Perform auth check per project
        await assert_can_access_project(current_user.id, project.team_id, db)
        await db.delete(project)
    
    await db.commit()
    return None
