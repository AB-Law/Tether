from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.cors_diagnostics import CorsDiagnosticsMiddleware
from app.api.error_handlers import register_exception_handlers
from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Starting Tether API")
    yield
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
