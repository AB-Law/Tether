from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, TokenResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/api/v1/auth",
        max_age=settings.refresh_token_ttl_days * 24 * 3600,
    )


@router.post("/login")
async def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    access_token, refresh_token = await auth_service.login(payload.email, payload.password, db)
    _set_refresh_cookie(response, refresh_token)
    await db.commit()
    return TokenResponse(
        access_token=access_token, expires_in=settings.access_token_ttl_minutes * 60
    )


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    raw_refresh_token = request.cookies.get("refresh_token")
    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh cookie"
        )
    access_token, refresh_token = await auth_service.refresh(raw_refresh_token, db)
    _set_refresh_cookie(response, refresh_token)
    await db.commit()
    return TokenResponse(
        access_token=access_token, expires_in=settings.access_token_ttl_minutes * 60
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    raw_refresh_token = request.cookies.get("refresh_token")
    if raw_refresh_token:
        await auth_service.logout(raw_refresh_token, db)
        await db.commit()
    response.delete_cookie("refresh_token", path="/api/v1/auth")
    return response


@router.get("/me")
async def me(current_user: Annotated[User, Depends(get_current_user)]) -> MeResponse:
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        timezone=current_user.timezone,
    )
