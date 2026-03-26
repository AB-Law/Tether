import re

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CorsDiagnosticsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        has_requested_method = request.headers.get("access-control-request-method") is not None
        is_preflight = request.method == "OPTIONS" and has_requested_method
        if not is_preflight:
            return await call_next(request)

        origin = request.headers.get("origin")
        requested_method = request.headers.get("access-control-request-method")
        requested_headers = request.headers.get("access-control-request-headers", "")

        response = await call_next(request)
        if response.status_code == 400:
            origin_allowed = self._is_origin_allowed(origin)
            logger.warning(
                "CORS preflight rejected",
                extra={
                    "path": request.url.path,
                    "origin": origin or "",
                    "requested_method": requested_method or "",
                    "requested_headers": requested_headers,
                    "configured_allow_origins": ",".join(settings.cors_origins),
                    "configured_origin_regex": settings.cors_origin_regex or "",
                    "origin_allowed": str(origin_allowed),
                },
            )
        else:
            logger.info(
                "CORS preflight accepted",
                extra={
                    "path": request.url.path,
                    "origin": origin or "",
                    "requested_method": requested_method or "",
                },
            )

        return response

    @staticmethod
    def _is_origin_allowed(origin: str | None) -> bool:
        if not origin:
            return False
        if origin in settings.cors_origins:
            return True
        if settings.cors_origin_regex:
            return re.match(settings.cors_origin_regex, origin) is not None
        return False
