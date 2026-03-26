from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import tag_repository


async def list_for_user(user_id: UUID, db: AsyncSession):
    return await tag_repository.list_for_user(user_id, db)
