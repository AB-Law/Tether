from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.journal import TagResponse
from app.services import tag_service

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("")
async def list_tags(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, list[TagResponse]]:
    tags = await tag_service.list_for_user(current_user.id, db)
    return {"data": [TagResponse.model_validate(tag) for tag in tags]}
