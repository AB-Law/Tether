from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.exceptions import AppException
from app.models.digest_run import DigestRun
from app.models.user import User

router = APIRouter(prefix="/digest", tags=["digest"])


@router.get("/latest")
async def get_latest_digest(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, dict[str, str]]:
    result = await db.execute(
        select(DigestRun)
        .where(DigestRun.user_id == current_user.id, DigestRun.status == "completed")
        .order_by(desc(DigestRun.created_at))
        .limit(1)
    )
    digest = result.scalar_one_or_none()
    if digest is None:
        raise AppException(
            code="digest_not_found",
            message="No digest has been generated yet",
            status_code=404,
        )
    return {
        "data": {
            "run_id": str(digest.id),
            "created_at": digest.created_at.isoformat(),
            "text": digest.response_text or "",
        }
    }

