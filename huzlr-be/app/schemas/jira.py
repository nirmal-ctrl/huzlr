from pydantic import BaseModel, ConfigDict, Field


class BindingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: int = Field(gt=0)
    cloud_id: str = Field(min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9-]+$")
    jira_project_id: str = Field(pattern=r"^\d+$", max_length=100)
    filter_id: int | None = Field(default=None, gt=0)


class SyncRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full: bool = False


class JiraContextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str = Field(min_length=36, max_length=36)
    project_id: int = Field(gt=0)
    operation: str = Field(default="overview", pattern=r"^(overview|item|dependencies|changes|evidence)$")
    issue: str | None = Field(default=None, max_length=100, pattern=r"^(\d+|[A-Za-z][A-Za-z0-9_]*-\d+)$")
    days: int = Field(default=7, ge=1, le=365)
    limit: int = Field(default=20, ge=1, le=100)
    cursor: int = Field(default=0, ge=0, le=10000)
    text_offset: int = Field(default=0, ge=0, le=2_000_000)
    text_limit: int = Field(default=6000, ge=100, le=12000)
    dataset: str = Field(default="comments", pattern=r"^(comments|changelog|worklogs|attachments|attachment_text)$")
