from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from models.invite import InviteRoleEnum, InviteStatusEnum

class InviteBase(BaseModel):
    email: EmailStr
    role: InviteRoleEnum = InviteRoleEnum.USER

class InviteCreate(InviteBase):
    workspace_id: int

class InviteResponse(InviteBase):
    id: int
    workspace_id: int
    status: InviteStatusEnum
    expires_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

class InviteAccept(BaseModel):
    invite_id: int
