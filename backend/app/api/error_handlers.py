from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppException


def _error_response(
    request: Request,
    code: str,
    message: str,
    status_code: int,
    details: dict | list | None = None,
) -> JSONResponse:
    request_id = request.headers.get("x-request-id", "")
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
                "request_id": request_id,
            }
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return _error_response(request, exc.code, exc.message, exc.status_code, exc.details)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _error_response(
            request,
            code="validation_error",
            message="Request validation failed",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=exc.errors(),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "not_found" if exc.status_code == 404 else "http_error"
        return _error_response(
            request,
            code=code,
            message=str(exc.detail),
            status_code=exc.status_code,
            details=None,
        )

    @app.exception_handler(Exception)
    async def fallback_exception_handler(request: Request, _: Exception) -> JSONResponse:
        return _error_response(
            request,
            code="internal_server_error",
            message="Unexpected server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=None,
        )
