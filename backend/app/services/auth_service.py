from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.repositories import user_repository


async def login(email: str, password: str, db: AsyncSession) -> tuple[str, str]:
    user = await user_repository.get_by_email(email, db)
    if user is None or not verify_password(password, user.password_hash):
        raise AppException(
            code="invalid_credentials", message="Invalid email or password", status_code=401
        )
    if not user.is_active:
        raise AppException(code="inactive_user", message="User is inactive", status_code=403)

    raw_refresh_token = generate_refresh_token()
    now = datetime.now(UTC)
    refresh_row = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh_token),
        expires_at=now + timedelta(days=settings.refresh_token_ttl_days),
        last_used_at=now,
    )
    db.add(refresh_row)
    access_token = create_access_token(str(user.id))
    await db.flush()
    return access_token, raw_refresh_token


async def refresh(raw_refresh_token: str, db: AsyncSession) -> tuple[str, str]:
    token_hash = hash_refresh_token(raw_refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    row = result.scalar_one_or_none()
    if row is None or row.revoked_at is not None or row.expires_at <= datetime.now(UTC):
        raise AppException(
            code="invalid_refresh_token", message="Invalid refresh token", status_code=401
        )

    row.revoked_at = datetime.now(UTC)
    row.last_used_at = datetime.now(UTC)
    new_refresh = generate_refresh_token()
    rotated = RefreshToken(
        user_id=row.user_id,
        token_hash=hash_refresh_token(new_refresh),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_ttl_days),
        last_used_at=datetime.now(UTC),
    )
    db.add(rotated)
    access_token = create_access_token(str(row.user_id))
    await db.flush()
    return access_token, new_refresh


async def logout(raw_refresh_token: str, db: AsyncSession) -> None:
    token_hash = hash_refresh_token(raw_refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    row = result.scalar_one_or_none()
    if row is not None:
        row.revoked_at = datetime.now(UTC)
        await db.flush()


async def get_current_user(token: str, db: AsyncSession) -> User:
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise AppException(code="invalid_token", message="Invalid access token", status_code=401)
    user = await user_repository.get_by_id(UUID(user_id), db)
    if user is None:
        raise AppException(code="user_not_found", message="User not found", status_code=401)
    if not user.is_active:
        raise AppException(code="inactive_user", message="User is inactive", status_code=403)
    return user
