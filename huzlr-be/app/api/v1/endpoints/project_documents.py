import asyncio
import logging

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
from services.gcs_storage import GCSObjectNotFound, GCSStorageError, gcs_storage

router = APIRouter()
logger = logging.getLogger(__name__)


def storage_unavailable(error: GCSStorageError) -> HTTPException:
    logger.error("Document storage operation failed: %s", error)
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Document storage is temporarily unavailable",
    )


async def document_response(document: ProjectDocument, include_content: bool = True) -> ProjectDocumentResponse:
    if not include_content:
        response = ProjectDocumentResponse.model_validate(document)
        return response.model_copy(update={"content": None})

    content = document.content
    if document.content_object_name:
        if not gcs_storage.enabled:
            raise storage_unavailable(GCSStorageError("GCS_BUCKET_NAME is not configured"))

        try:
            content = await gcs_storage.download_text(document.content_object_name)
        except GCSObjectNotFound as error:
            if content is None:
                raise storage_unavailable(error) from error
        except GCSStorageError as error:
            raise storage_unavailable(error) from error

    response = ProjectDocumentResponse.model_validate(document)
    return response.model_copy(update={"content": content})

@router.get("/projects/{project_id}/documents", response_model=list[ProjectDocumentResponse])
async def list_project_documents(
    project_id: int,
    include_content: bool = False,
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
    return await asyncio.gather(*(
        document_response(document, include_content=include_content)
        for document in documents
    ))


@router.get("/documents/{document_id}", response_model=ProjectDocumentResponse)
async def get_project_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ProjectDocument).where(ProjectDocument.document_id == document_id))
    document = result.scalars().first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    result = await db.execute(select(Project).where(Project.project_id == document.project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await assert_can_access_project(current_user.id, project.team_id, db)
    return await document_response(document)

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

    document_data = document.model_dump()
    content = document_data.pop("content", None)
    db_document = ProjectDocument(**document_data, content=content)
    db.add(db_document)
    await db.flush()

    uploaded_object_name: str | None = None
    try:
        if content is not None and gcs_storage.enabled:
            uploaded_object_name = gcs_storage.document_object_name(project_id, db_document.document_id)
            await gcs_storage.upload_text(uploaded_object_name, content)
            db_document.content_object_name = uploaded_object_name
            db_document.content = None

        await db.commit()
        await db.refresh(db_document)
        return await document_response(db_document)
    except GCSStorageError as error:
        await db.rollback()
        raise storage_unavailable(error) from error
    except Exception:
        await db.rollback()
        if uploaded_object_name:
            try:
                await gcs_storage.delete(uploaded_object_name)
            except GCSStorageError:
                pass
        raise

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
    content_was_updated = "content" in update_data
    content = update_data.pop("content", None)

    if content_was_updated:
        if gcs_storage.enabled:
            object_name = db_document.content_object_name or gcs_storage.document_object_name(
                db_document.project_id,
                db_document.document_id,
            )
            try:
                await gcs_storage.upload_text(object_name, content or "")
            except GCSStorageError as error:
                raise storage_unavailable(error) from error

            db_document.content_object_name = object_name
            db_document.content = None
        elif db_document.content_object_name:
            raise storage_unavailable(GCSStorageError("GCS_BUCKET_NAME is not configured"))
        else:
            db_document.content = content

    for key, value in update_data.items():
        setattr(db_document, key, value)

    await db.commit()
    await db.refresh(db_document)
    return await document_response(db_document)

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

    if db_document.content_object_name:
        if not gcs_storage.enabled:
            raise storage_unavailable(GCSStorageError("GCS_BUCKET_NAME is not configured"))
        try:
            await gcs_storage.delete(db_document.content_object_name)
        except GCSStorageError as error:
            raise storage_unavailable(error) from error

    await db.delete(db_document)
    await db.commit()
    return None
