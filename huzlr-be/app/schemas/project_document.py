from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ProjectDocumentBase(BaseModel):
    title: str
    content: Optional[str] = None
    emoji: Optional[str] = "📄"

class ProjectDocumentCreate(ProjectDocumentBase):
    project_id: int

class ProjectDocumentUpdate(ProjectDocumentBase):
    title: Optional[str] = None

class ProjectDocumentResponse(ProjectDocumentBase):
    document_id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
