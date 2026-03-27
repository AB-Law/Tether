from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.pagination import PaginationMeta
from app.domain.almanac.rules import EntryTypeEnum
from app.schemas.journal import TagResponse


class AlmanacEntryCreate(BaseModel):
    entry_type: EntryTypeEnum
    title: str = Field(min_length=1)
    body: str | None = None
    tag_names: list[str] = Field(default_factory=list)
    due_date: date | None = None
    reminder_at: datetime | None = None
    is_completed: bool | None = None
    completed_at: datetime | None = None


class AlmanacCaptureRequest(BaseModel):
    title: str = Field(min_length=1)
    body: str | None = None
    entry_type: EntryTypeEnum = EntryTypeEnum.RANDOM_THOUGHT


class AlmanacEntryUpdate(BaseModel):
    entry_type: EntryTypeEnum | None = None
    title: str | None = Field(default=None, min_length=1)
    body: str | None = None
    tag_names: list[str] | None = None
    due_date: date | None = None
    reminder_at: datetime | None = None
    is_completed: bool | None = None
    completed_at: datetime | None = None


class AlmanacEntryResponse(BaseModel):
    id: UUID
    user_id: UUID
    entry_type: EntryTypeEnum
    title: str
    body: str | None = None
    due_date: date | None = None
    reminder_at: datetime | None = None
    is_completed: bool
    completed_at: datetime | None = None
    source: str
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class AlmanacEntryListResponse(BaseModel):
    data: list[AlmanacEntryResponse]
    meta: PaginationMeta
