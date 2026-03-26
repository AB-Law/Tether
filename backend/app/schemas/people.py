from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.pagination import PaginationMeta
from app.domain.people.rules import RelationshipTypeEnum


class PersonCreate(BaseModel):
    name: str
    relationship_type: RelationshipTypeEnum
    birthday: date | None = None
    location: str | None = None
    notes: str | None = None
    contact_cadence_days: int | None = Field(default=None, ge=1, le=3650)


class PersonUpdate(BaseModel):
    name: str | None = None
    relationship_type: RelationshipTypeEnum | None = None
    birthday: date | None = None
    location: str | None = None
    notes: str | None = None
    contact_cadence_days: int | None = Field(default=None, ge=1, le=3650)


class PersonResponse(BaseModel):
    id: UUID
    name: str
    relationship_type: str
    birthday: date | None = None
    location: str | None = None
    notes: str | None = None
    contact_cadence_days: int | None = None
    warmth_score: float
    last_talked_at: date | None = None
    next_nudge_at: datetime | None = None
    archived_at: datetime | None = None

    model_config = {"from_attributes": True}


class PersonListResponse(BaseModel):
    data: list[PersonResponse]
    meta: PaginationMeta
