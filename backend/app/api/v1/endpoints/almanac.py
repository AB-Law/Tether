from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.almanac import (
    AlmanacCaptureRequest,
    AlmanacEntryCreate,
    AlmanacEntryListResponse,
    AlmanacEntryResponse,
    AlmanacEntryUpdate,
)
from app.services import almanac_service

router = APIRouter(prefix="/almanac", tags=["almanac"])


@router.get("/entries")
async def list_entries(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    entry_type: Annotated[str | None, Query()] = None,
    tag: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
    is_completed: Annotated[bool | None, Query()] = None,
    due_date_before: Annotated[date | None, Query()] = None,
    due_date_after: Annotated[date | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> AlmanacEntryListResponse:
    result = await almanac_service.list_entries(
        current_user.id,
        {
            "entry_type": entry_type,
            "tag": tag,
            "search": search,
            "is_completed": is_completed,
            "due_date_before": due_date_before,
            "due_date_after": due_date_after,
        },
        page,
        page_size,
        db,
    )
    return AlmanacEntryListResponse(
        data=[AlmanacEntryResponse.model_validate(entry) for entry in result["data"]],
        meta=result["meta"],
    )


@router.post("/entries", status_code=status.HTTP_201_CREATED)
async def create_entry(
    payload: Annotated[AlmanacEntryCreate, Body()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AlmanacEntryResponse:
    entry = await almanac_service.create_entry(payload.model_dump(), current_user.id, db)
    await db.commit()
    return AlmanacEntryResponse.model_validate(entry)


@router.post("/capture", status_code=status.HTTP_201_CREATED)
async def quick_capture(
    payload: Annotated[AlmanacCaptureRequest, Body()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AlmanacEntryResponse:
    entry = await almanac_service.capture(payload.model_dump(), current_user.id, db)
    await db.commit()
    return AlmanacEntryResponse.model_validate(entry)


@router.get("/entries/{entry_id}")
async def get_entry(
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AlmanacEntryResponse:
    entry = await almanac_service.get_entry(entry_id, current_user.id, db)
    return AlmanacEntryResponse.model_validate(entry)


@router.patch("/entries/{entry_id}")
async def update_entry(
    entry_id: UUID,
    payload: Annotated[AlmanacEntryUpdate, Body()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AlmanacEntryResponse:
    entry = await almanac_service.update_entry(
        entry_id, current_user.id, payload.model_dump(exclude_unset=True), db
    )
    await db.commit()
    return AlmanacEntryResponse.model_validate(entry)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await almanac_service.delete_entry(entry_id, current_user.id, db)
    await db.commit()


@router.post("/entries/{entry_id}/complete")
async def complete_entry(
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AlmanacEntryResponse:
    entry = await almanac_service.complete_entry(entry_id, current_user.id, db)
    await db.commit()
    return AlmanacEntryResponse.model_validate(entry)
