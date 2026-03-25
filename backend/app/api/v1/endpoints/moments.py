from fastapi import APIRouter

router = APIRouter(prefix="/moments", tags=["moments"])


@router.get("")
async def moments_stub() -> dict[str, str]:
    return {"status": "not_implemented"}
