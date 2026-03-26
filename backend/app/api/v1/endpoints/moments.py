from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.moments import MomentCreate, MomentResponse, MomentUpdate
from app.services import moment_service

router = APIRouter(tags=["moments"])


@router.get("/people/{person_id}/moments")
async def list_person_moments(
    person_id: Annotated[UUID, Path()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[MomentResponse]:
    moments = await moment_service.list_moments(person_id, current_user.id, db)
    return [MomentResponse.model_validate(moment) for moment in moments]


@router.post(
    "/people/{person_id}/moments",
    status_code=status.HTTP_201_CREATED,
)
async def create_person_moment(
    person_id: Annotated[UUID, Path()],
    payload: Annotated[MomentCreate, Body()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MomentResponse:
    data = payload.model_dump()
    data["person_id"] = person_id
    moment = await moment_service.create_moment(data, current_user.id, db)
    await db.commit()
    return MomentResponse.model_validate(moment)


@router.get("/moments/{moment_id}")
async def get_moment(
    moment_id: Annotated[UUID, Path()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MomentResponse:
    moment = await moment_service.get_moment(moment_id, current_user.id, db)
    return MomentResponse.model_validate(moment)


@router.patch("/moments/{moment_id}")
async def update_moment(
    moment_id: Annotated[UUID, Path()],
    payload: Annotated[MomentUpdate, Body()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MomentResponse:
    moment = await moment_service.update_moment(
        moment_id, current_user.id, payload.model_dump(exclude_unset=True), db
    )
    await db.commit()
    return MomentResponse.model_validate(moment)


@router.delete("/moments/{moment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_moment(
    moment_id: Annotated[UUID, Path()],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await moment_service.delete_moment(moment_id, current_user.id, db)
    await db.commit()
