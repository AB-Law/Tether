from fastapi import APIRouter

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("")
async def reminders_stub() -> dict[str, str]:
    return {"status": "not_implemented"}
