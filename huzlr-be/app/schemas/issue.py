from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional, Dict, Any, List

class IssueBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "pending"
    milestone_id: Optional[int] = None
    duration_days: Optional[int] = None
    estimated_start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    critical_path_flag: bool = False
    order_index: Optional[int] = None
    properties: Optional[Dict[str, Any]] = None
    parent_id: Optional[int] = None

class IssueCreate(IssueBase):
    project_id: int

class IssueUpdate(IssueBase):
    title: Optional[str] = None
    status: Optional[str] = None

class IssueResponse(IssueBase):
    id: int
    project_id: int
    subtasks: List["IssueResponse"] = []
    
    model_config = ConfigDict(from_attributes=True)
