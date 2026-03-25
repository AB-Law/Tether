from fastapi import APIRouter

router = APIRouter(prefix="/people", tags=["people"])


@router.get("")
async def people_stub() -> dict[str, str]:
    return {"status": "not_implemented"}
