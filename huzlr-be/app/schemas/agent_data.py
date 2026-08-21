from typing import Literal, Optional

from pydantic import BaseModel, Field


class AgentTeamResponse(BaseModel):
    id: int
    name: str
    workspace_id: int
    workspace_name: str


class AgentProjectResponse(BaseModel):
    id: int
    title: str
    path: str


class AgentMilestoneResponse(BaseModel):
    id: int
    title: str


class AgentIssueResponse(BaseModel):
    id: int
    title: str
    status: str


class AgentDocumentResponse(BaseModel):
    id: int
    title: str


class AgentTranscriptCreate(BaseModel):
    speaker_type: Literal["agent", "participant"]
    speaker_id: Optional[str] = Field(default=None, max_length=255)
    text: str = Field(min_length=1, max_length=20_000)
    interrupted: bool = False


class AgentTranscriptResponse(BaseModel):
    id: int
