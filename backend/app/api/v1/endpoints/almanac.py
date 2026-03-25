from fastapi import APIRouter

router = APIRouter(prefix="/almanac", tags=["almanac"])


@router.get("")
async def almanac_stub() -> dict[str, str]:
    return {"status": "not_implemented"}
