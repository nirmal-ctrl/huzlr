from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from models.workspace_membership import WorkspaceRoleEnum

class WorkspaceBase(BaseModel):
    name: str

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    owner_id: Optional[int] = None

class UserMinResponse(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True

class WorkspaceMembershipBase(BaseModel):
    user_id: int
    role: WorkspaceRoleEnum

class WorkspaceMembershipResponse(WorkspaceMembershipBase):
    id: int
    workspace_id: int
    created_at: datetime
    user: Optional[UserMinResponse] = None
    
    class Config:
        from_attributes = True

class WorkspaceResponse(WorkspaceBase):
    id: int
    owner_id: int
    created_by: int
    created_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class WorkspaceWithMembersResponse(WorkspaceResponse):
    memberships: List[WorkspaceMembershipResponse] = []
