from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.exceptions import AppException
from app.models.user import User
from app.repositories import reminder_repository
from app.schemas.reminders import (
    ReminderCreate,
    ReminderResponse,
    ReminderSnoozeRequest,
    ReminderUpdate,
)

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("")
async def list_reminders(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[ReminderResponse]:
    reminders = await reminder_repository.list_for_user(
        current_user.id, db, status, page, page_size
    )
    return [ReminderResponse.model_validate(reminder) for reminder in reminders]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_reminder(
    payload: ReminderCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderResponse:
    reminder = await reminder_repository.create(payload.model_dump(), current_user.id, db)
    await db.commit()
    return ReminderResponse.model_validate(reminder)


@router.patch("/{reminder_id}")
async def update_reminder(
    reminder_id: UUID,
    payload: ReminderUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderResponse:
    reminder = await reminder_repository.get_for_user(reminder_id, current_user.id, db)
    if reminder is None:
        raise AppException(code="reminder_not_found", message="Reminder not found", status_code=404)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(reminder, key, value)
    await db.commit()
    return ReminderResponse.model_validate(reminder)


@router.post("/{reminder_id}/snooze")
async def snooze_reminder(
    reminder_id: UUID,
    payload: ReminderSnoozeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderResponse:
    reminder = await reminder_repository.get_for_user(reminder_id, current_user.id, db)
    if reminder is None:
        raise AppException(code="reminder_not_found", message="Reminder not found", status_code=404)
    reminder = await reminder_repository.snooze(reminder, payload.until, db)
    await db.commit()
    return ReminderResponse.model_validate(reminder)
