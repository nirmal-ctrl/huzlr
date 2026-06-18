from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from models.project_document import ProjectDocument
from models.project import Project
from schemas.project_document import ProjectDocumentResponse, ProjectDocumentCreate, ProjectDocumentUpdate
from models.user import User
from api.deps import get_current_user
from core.access import assert_can_access_project

router = APIRouter()

@router.get("/projects/{project_id}/documents", response_model=list[ProjectDocumentResponse])
async def list_project_documents(
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
        select(ProjectDocument).where(ProjectDocument.project_id == project_id).order_by(ProjectDocument.created_at.desc())
    )
    documents = result.scalars().all()
    return documents

@router.post("/projects/{project_id}/documents", response_model=ProjectDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_project_document(
    project_id: int,
    document: ProjectDocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if document.project_id != project_id:
        raise HTTPException(status_code=400, detail="Project ID in path does not match payload")

    # Verify project exists and user has access
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await assert_can_access_project(current_user.id, project.team_id, db)

    db_document = ProjectDocument(**document.model_dump())
    db.add(db_document)
    await db.commit()
    await db.refresh(db_document)
    return db_document

@router.put("/documents/{document_id}", response_model=ProjectDocumentResponse)
async def update_project_document(
    document_id: int,
    document_update: ProjectDocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ProjectDocument).where(ProjectDocument.document_id == document_id))
    db_document = result.scalars().first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify user owns the project this document belongs to
    result = await db.execute(select(Project).where(Project.project_id == db_document.project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await assert_can_access_project(current_user.id, project.team_id, db)

    update_data = document_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_document, key, value)

    await db.commit()
    await db.refresh(db_document)
    return db_document

@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ProjectDocument).where(ProjectDocument.document_id == document_id))
    db_document = result.scalars().first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify user owns the project
    result = await db.execute(select(Project).where(Project.project_id == db_document.project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await assert_can_access_project(current_user.id, project.team_id, db)

    await db.delete(db_document)
    await db.commit()
    return None
