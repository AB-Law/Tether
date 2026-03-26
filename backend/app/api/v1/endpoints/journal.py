from collections.abc import AsyncGenerator
from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.exceptions import AppException
from app.models.user import User
from app.repositories import journal_repository
from app.schemas.journal import (
    DailyPromptResponse,
    JournalAiRunResponse,
    JournalEntryCreate,
    JournalEntryListResponse,
    JournalEntryResponse,
    JournalEntryUpdate,
    ReflectRequest,
    ReflectResponse,
)
from app.services import daily_prompt_service, journal_ai_service, journal_service

router = APIRouter(prefix="/journal", tags=["journal"])


@router.get("")
async def journal_stub() -> dict[str, str]:
    # Backward-compatible placeholder route retained for existing tests.
    return {"status": "not_implemented"}


@router.get("/entries")
async def list_entries(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
    tag: Annotated[str | None, Query()] = None,
    person_id: Annotated[UUID | None, Query()] = None,
    mood: Annotated[list[int] | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> JournalEntryListResponse:
    result = await journal_service.list_entries(
        current_user.id,
        {
            "start_date": start_date,
            "end_date": end_date,
            "tag": tag,
            "person_id": person_id,
            "moods": mood,
            "search": search,
        },
        page,
        page_size,
        db,
    )
    return JournalEntryListResponse(
        data=[JournalEntryResponse.model_validate(entry) for entry in result["data"]],
        meta=result["meta"],
    )


@router.post("/entries", status_code=status.HTTP_201_CREATED)
async def create_entry(
    payload: Annotated[JournalEntryCreate, Body()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JournalEntryResponse:
    entry = await journal_service.create_entry(payload.model_dump(), current_user.id, db)
    await db.commit()
    return JournalEntryResponse.model_validate(entry)


@router.get("/entries/{entry_id}")
async def get_entry(
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JournalEntryResponse:
    entry = await journal_service.get_entry(entry_id, current_user.id, db)
    return JournalEntryResponse.model_validate(entry)


@router.patch("/entries/{entry_id}")
async def update_entry(
    entry_id: UUID,
    payload: Annotated[JournalEntryUpdate, Body()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JournalEntryResponse:
    entry = await journal_service.update_entry(
        entry_id, current_user.id, payload.model_dump(exclude_unset=True), db
    )
    await db.commit()
    return JournalEntryResponse.model_validate(entry)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await journal_service.delete_entry(entry_id, current_user.id, db)
    await db.commit()


@router.get("/prompts/daily")
async def get_daily_prompt(
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, DailyPromptResponse]:
    prompt = daily_prompt_service.get_daily_prompt(current_user.timezone)
    return {
        "data": DailyPromptResponse(prompt=prompt)
    }


@router.post("/entries/{entry_id}/reflect")
async def reflect_entry(
    entry_id: UUID,
    payload: Annotated[ReflectRequest, Body()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, ReflectResponse]:
    run = await journal_ai_service.trigger_reflection(entry_id, payload.mode, current_user.id, db)
    await db.commit()
    return {
        "data": ReflectResponse(
            run_id=run.id,
            status=run.status,
            reflection=run.response_text,
            tokens_input=run.tokens_input,
            tokens_output=run.tokens_output,
            error_message=run.error_message,
        )
    }


@router.get("/entries/{entry_id}/reflect/stream")
async def stream_reflection(
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    mode: Annotated[str, Query()] = "entry_plus_recent_context",
) -> StreamingResponse:
    async def event_stream() -> AsyncGenerator[str, None]:
        async for chunk in journal_ai_service.stream_reflection(
            entry_id, mode, current_user.id, db
        ):
            yield chunk
        yield "data: [DONE]\n\n"
        await db.commit()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/entries/{entry_id}/ai-runs")
async def list_ai_runs(
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, list[JournalAiRunResponse]]:
    entry = await journal_repository.get_by_id_including_deleted(entry_id, current_user.id, db)
    if entry is None:
        raise AppException(
            code="journal_entry_not_found",
            message="Journal entry not found",
            status_code=404,
        )
    entries = await journal_repository.list_ai_runs(entry_id, current_user.id, db)
    return {"data": [JournalAiRunResponse.model_validate(run) for run in entries]}
