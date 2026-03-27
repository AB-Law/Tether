from fastapi import APIRouter

from app.api.v1.endpoints import (
    almanac,
    auth,
    digest,
    health,
    journal,
    moments,
    people,
    reminders,
    tags,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(people.router)
api_router.include_router(moments.router)
api_router.include_router(journal.router)
api_router.include_router(tags.router)
api_router.include_router(almanac.router)
api_router.include_router(reminders.router)
api_router.include_router(digest.router)
