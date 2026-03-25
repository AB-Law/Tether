from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/stub")
async def auth_stub() -> dict[str, str]:
    return {"status": "not_implemented"}
