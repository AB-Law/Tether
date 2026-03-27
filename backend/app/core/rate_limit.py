from collections import defaultdict, deque
from collections.abc import Callable
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.logging import get_logger
from app.models.user import User

logger = get_logger(__name__)


class RateLimiter:
    _hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def __init__(self, endpoint_key: str, max_calls: int, window_seconds: int) -> None:
        self.endpoint_key = endpoint_key
        self.max_calls = max_calls
        self.window_seconds = window_seconds

    async def __call__(
        self,
        response: Response,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        del db  # dependency consistency and future store-backed limiter parity
        now = datetime.now(UTC).timestamp()
        key = (str(current_user.id), self.endpoint_key)
        bucket = self._hits[key]
        cutoff = now - self.window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= self.max_calls:
            retry_after = max(1, int(self.window_seconds - (now - bucket[0])))
            response.headers["Retry-After"] = str(retry_after)
            logger.warning(
                "Rate limit exceeded",
                extra={
                    "user_id": str(current_user.id),
                    "endpoint": self.endpoint_key,
                    "current_count": len(bucket),
                },
            )
            raise HTTPException(
                status_code=429,
                detail={
                    "error": {
                        "code": "rate_limit_exceeded",
                        "message": "Rate limit exceeded. Try again later.",
                    }
                },
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)


def shared_reflection_rate_limit() -> Callable[..., None]:
    return RateLimiter("journal_reflect_shared", max_calls=10, window_seconds=3600)

