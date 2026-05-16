from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    # is_default should likely not be easily updatable, or at least handled carefully

class TeamMembershipBase(BaseModel):
    user_id: int

class TeamMembershipResponse(TeamMembershipBase):
    id: int
    team_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TeamResponse(TeamBase):
    id: int
    workspace_id: int
    created_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TeamWithMembersResponse(TeamResponse):
    memberships: List[TeamMembershipResponse] = []
