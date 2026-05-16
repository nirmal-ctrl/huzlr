from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional, Dict, Any

class TaskBase(BaseModel):
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

class TaskCreate(TaskBase):
    project_id: int

class TaskUpdate(TaskBase):
    title: Optional[str] = None
    status: Optional[str] = None

class TaskResponse(TaskBase):
    id: int
    project_id: int
    
    model_config = ConfigDict(from_attributes=True)
