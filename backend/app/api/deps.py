from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.user import User
from app.services import auth_service


async def get_db(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> AsyncGenerator[AsyncSession, None]:
    yield db_session


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    return await auth_service.get_current_user(token, db)
