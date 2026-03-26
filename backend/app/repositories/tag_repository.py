from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag


async def get_or_create(name: str, user_id: UUID, db: AsyncSession) -> Tag:
    normalized_name = name.strip()
    if not normalized_name:
        raise ValueError("Tag name cannot be empty")
    existing = await db.execute(
        select(Tag).where(Tag.user_id == user_id, func.lower(Tag.name) == normalized_name.lower())
    )
    tag = existing.scalar_one_or_none()
    if tag is not None:
        return tag
    tag = Tag(user_id=user_id, name=normalized_name)
    db.add(tag)
    await db.flush()
    return tag


async def list_for_user(user_id: UUID, db: AsyncSession) -> list[Tag]:
    return (
        (await db.execute(select(Tag).where(Tag.user_id == user_id).order_by(Tag.name.asc())))
        .scalars()
        .all()
    )
