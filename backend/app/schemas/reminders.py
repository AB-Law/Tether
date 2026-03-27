from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ReminderCreate(BaseModel):
    entity_type: str
    entity_id: UUID
    reminder_type: str
    scheduled_for: datetime
    channel: str = "in_app"
    payload: dict | None = None


class ReminderUpdate(BaseModel):
    scheduled_for: datetime | None = None
    channel: str | None = None
    status: str | None = None


class ReminderSnoozeRequest(BaseModel):
    until: datetime


class ReminderResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    reminder_type: str
    scheduled_for: datetime
    status: str
    channel: str
    payload: dict | None = None

    model_config = {"from_attributes": True}
