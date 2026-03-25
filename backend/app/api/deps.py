from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session


async def get_db(
    db_session: AsyncSession = Depends(get_db_session),
) -> AsyncGenerator[AsyncSession, None]:
    yield db_session
