from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def readiness_check(db_session: AsyncSession = Depends(get_db_session)) -> JSONResponse:
    try:
        await db_session.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unavailable", "detail": "database unreachable"},
        )
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ready"})
