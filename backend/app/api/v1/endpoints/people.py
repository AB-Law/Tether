from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.people import PersonCreate, PersonListResponse, PersonResponse, PersonUpdate
from app.services import people_service

router = APIRouter(prefix="/people", tags=["people"])


@router.get("/drifting-away")
async def get_drifting_away(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PersonResponse]:
    people = await people_service.get_drifting_away(current_user.id, db)
    return [PersonResponse.model_validate(person) for person in people]


@router.get("/new")
async def get_new_people(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PersonResponse]:
    people = await people_service.get_new_people(current_user.id, db)
    return [PersonResponse.model_validate(person) for person in people]


@router.get("")
async def list_people(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    relationship_type: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
    archived: Annotated[bool, Query()] = False,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PersonListResponse:
    result = await people_service.list_people(
        current_user.id, relationship_type, search, archived, page, page_size, db
    )
    return PersonListResponse(
        data=[PersonResponse.model_validate(person) for person in result["data"]],
        meta=result["meta"],
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_person(
    payload: PersonCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PersonResponse:
    person = await people_service.create_person(payload.model_dump(), current_user.id, db)
    await db.commit()
    return PersonResponse.model_validate(person)


@router.get("/{person_id}")
async def get_person(
    person_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PersonResponse:
    person = await people_service.get_person(person_id, current_user.id, db)
    return PersonResponse.model_validate(person)


@router.patch("/{person_id}")
async def update_person(
    person_id: UUID,
    payload: PersonUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PersonResponse:
    updates = payload.model_dump(exclude_unset=True)
    person = await people_service.update_person(person_id, current_user.id, updates, db)
    await db.commit()
    return PersonResponse.model_validate(person)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_person(
    person_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await people_service.archive_person(person_id, current_user.id, db)
    await db.commit()


@router.get("/{person_id}/timeline")
async def get_person_timeline(
    person_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, list]:
    await people_service.get_person(person_id, current_user.id, db)
    return {"data": []}
