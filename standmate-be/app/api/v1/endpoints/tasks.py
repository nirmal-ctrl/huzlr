from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from core.database import get_db
from models.task import Task
from models.project import Project
from schemas.task import TaskResponse, TaskCreate, TaskUpdate
from models.user import User
from api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=list[TaskResponse])
async def get_all_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tasks for all projects owned by the current user."""
    result = await db.execute(
        select(Task)
        .options(selectinload(Task._property_record))
        .join(Project, Task.project_id == Project.project_id)
        .where(Project.user_id == current_user.id)
        .order_by(Task.order_index)
    )
    tasks = result.scalars().all()
    return tasks

@router.get("/project/{project_id}", response_model=list[TaskResponse])
async def list_project_tasks(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify project exists and user has access
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(Task)
        .options(selectinload(Task._property_record))
        .where(Task.project_id == project_id)
        .order_by(Task.order_index)
    )
    tasks = result.scalars().all()
    return tasks

@router.post("/project/{project_id}", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_project_task(
    project_id: int,
    task: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if task.project_id != project_id:
        raise HTTPException(status_code=400, detail="Project ID in path does not match payload")

    # Verify project exists and user has access
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    task_data = task.model_dump()
    properties = task_data.pop("properties", None)
    
    db_task = Task(**task_data)
    if properties is not None:
        db_task.properties = properties
        
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    
    # Refresh to ensure relationships are loaded
    result = await db.execute(select(Task).options(selectinload(Task._property_record)).where(Task.id == db_task.id))
    db_task = result.scalars().first()
    return db_task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Task)
        .options(selectinload(Task._property_record))
        .where(Task.id == task_id)
    )
    db_task = result.scalars().first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Verify user owns the project this task belongs to
    result = await db.execute(select(Project).where(Project.project_id == db_task.project_id))
    project = result.scalars().first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = task_update.model_dump(exclude_unset=True)
    properties = update_data.pop("properties", None)
    
    for key, value in update_data.items():
        setattr(db_task, key, value)

    if properties is not None:
        db_task.properties = properties
        if db_task._property_record:
            flag_modified(db_task._property_record, "data")

    await db.commit()
    await db.refresh(db_task)
    
    result = await db.execute(
        select(Task)
        .options(selectinload(Task._property_record))
        .where(Task.id == db_task.id)
    )
    return result.scalars().first()

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    db_task = result.scalars().first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Verify user owns the project
    result = await db.execute(select(Project).where(Project.project_id == db_task.project_id))
    project = result.scalars().first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(db_task)
    await db.commit()
    return None
