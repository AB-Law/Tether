import asyncio
import os
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.cors_diagnostics import CorsDiagnosticsMiddleware
from app.api.error_handlers import register_exception_handlers
from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.workers.reminder_jobs import run_poll_loop

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Starting Tether API")
    reminder_task = None
    if settings.app_env != "test" and os.getenv("PYTEST_CURRENT_TEST") is None:
        reminder_task = asyncio.create_task(run_poll_loop())
    yield
    if reminder_task is not None:
        reminder_task.cancel()
        with suppress(asyncio.CancelledError):
            await reminder_task
    logger.info("Stopping Tether API")


app = FastAPI(title="Tether", version="0.1.0", lifespan=lifespan)
app.add_middleware(CorsDiagnosticsMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
register_exception_handlers(app)
