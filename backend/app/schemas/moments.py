from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.domain.people.rules import MomentTypeEnum, SentimentEnum


class MomentCreate(BaseModel):
    person_id: UUID
    title: str
    moment_type: MomentTypeEnum
    sentiment: SentimentEnum
    occurred_on: date
    what_happened: str
    notes: str | None = None


class MomentUpdate(BaseModel):
    title: str | None = None
    moment_type: MomentTypeEnum | None = None
    sentiment: SentimentEnum | None = None
    occurred_on: date | None = None
    what_happened: str | None = None
    notes: str | None = None


class MomentResponse(BaseModel):
    id: UUID
    person_id: UUID
    title: str
    moment_type: str
    sentiment: str
    occurred_on: date
    what_happened: str
    notes: str | None = Field(default=None)
    deleted_at: datetime | None = Field(default=None)

    model_config = {"from_attributes": True}
