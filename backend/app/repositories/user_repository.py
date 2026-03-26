from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_by_email(email: str, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_by_id(user_id: UUID, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create(
    email: str, password_hash: str, display_name: str | None, db: AsyncSession
) -> User:
    user = User(email=email, password_hash=password_hash, display_name=display_name)
    db.add(user)
    await db.flush()
    return user
