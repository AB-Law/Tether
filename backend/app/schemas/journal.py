from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.pagination import PaginationMeta


class TagResponse(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}


class PersonSummary(BaseModel):
    id: UUID
    name: str
    relationship_type: str
    location: str | None = None

    model_config = {"from_attributes": True}


class JournalEntryCreate(BaseModel):
    entry_date: date
    body: str = Field(min_length=1)
    mood: int | None = Field(default=None, ge=1, le=5)
    tag_names: list[str] = Field(default_factory=list)
    person_ids: list[UUID] = Field(default_factory=list)
    ai_prompt_used: str | None = None


class JournalEntryUpdate(BaseModel):
    entry_date: date | None = None
    body: str | None = None
    mood: int | None = Field(default=None, ge=1, le=5)
    tag_names: list[str] | None = None
    person_ids: list[UUID] | None = None
    ai_prompt_used: str | None = None


class JournalEntryResponse(BaseModel):
    id: UUID
    user_id: UUID
    entry_date: date
    body: str
    mood: int | None = None
    ai_prompt_used: str | None = None
    latest_ai_reflection: str | None = None
    latest_ai_reflected_at: datetime | None = None
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = Field(default_factory=list)
    people: list[PersonSummary] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class JournalEntryListResponse(BaseModel):
    data: list[JournalEntryResponse]
    meta: PaginationMeta


class DailyPromptResponse(BaseModel):
    prompt: str
    source: str = "static"


class ReflectRequest(BaseModel):
    mode: str = "entry_plus_recent_context"


class ReflectResponse(BaseModel):
    run_id: UUID
    status: str
    reflection: str | None = None
    tokens_input: int | None = None
    tokens_output: int | None = None
    error_message: str | None = None


class JournalAiRunResponse(BaseModel):
    id: UUID
    journal_entry_id: UUID
    run_type: str
    status: str
    response_text: str | None = None
    tokens_input: int | None = None
    tokens_output: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
