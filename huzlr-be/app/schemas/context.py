from typing import Literal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class SessionCreate(StrictModel):
    workspace_id: int = Field(gt=0)
    project_ids: list[int] = Field(min_length=1, max_length=10)

    @field_validator("project_ids")
    @classmethod
    def valid_projects(cls, value):
        if any(p <= 0 for p in value):
            raise ValueError("Project IDs must be positive")
        return sorted(set(value))


class SearchRequest(StrictModel):
    session_id: str = Field(min_length=36, max_length=36)
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=12, ge=1, le=30)


class HistoryRequest(StrictModel):
    session_id: str = Field(min_length=36, max_length=36)
    project_id: int = Field(gt=0)
    source_id: str | None = Field(default=None, max_length=500)
    as_of: datetime | None = None
    cursor: int = Field(default=0, ge=0, le=100000)
    limit: int = Field(default=20, ge=1, le=50)

    @field_validator("as_of")
    @classmethod
    def aware_timestamp(cls, value):
        if value is not None and value.utcoffset() is None:
            raise ValueError("as_of must include a timezone")
        return value


class NoteCreate(StrictModel):
    project_id: int = Field(gt=0)
    text: str = Field(min_length=1, max_length=12000)
    id: str = Field(min_length=36, max_length=36)


class ClaimCandidate(StrictModel):
    predicate: Literal["requirement", "decision", "blocker", "risk", "assumption", "ownership", "deadline"]
    statement: str = Field(min_length=1, max_length=1000)
    evidence: str = Field(min_length=1, max_length=2000)
    confidence: float = Field(ge=0, le=1)


class Extraction(StrictModel):
    claims: list[ClaimCandidate] = Field(default_factory=list, max_length=20)


class ClaimReview(StrictModel):
    status: Literal["active", "retracted"]
    supersedes_id: str | None = Field(default=None, max_length=64)


class IssueProposal(StrictModel):
    project_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10000)


class ActionCreate(IssueProposal):
    session_id: str = Field(min_length=36, max_length=36)


class ChatRequest(StrictModel):
    session_id: str = Field(min_length=36, max_length=36)
    message: str = Field(min_length=1, max_length=4000)


class ChatAnswer(StrictModel):
    message: str = Field(min_length=1, max_length=12000)
    source_ids: list[str] = Field(default_factory=list, max_length=30)
    proposed_issue: IssueProposal | None = None


class MeetingProjects(StrictModel):
    project_ids: list[int] = Field(default_factory=list, max_length=10)


class VoiceEvidence(StrictModel):
    id: str = Field(min_length=36, max_length=36)
    text: str = Field(min_length=1, max_length=12000)
