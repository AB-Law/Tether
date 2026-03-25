from fastapi import APIRouter

from app.api.v1.endpoints import almanac, auth, health, journal, moments, people, reminders

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(people.router)
api_router.include_router(moments.router)
api_router.include_router(journal.router)
api_router.include_router(almanac.router)
api_router.include_router(reminders.router)
