from fastapi import APIRouter

router = APIRouter(prefix="/journal", tags=["journal"])


@router.get("")
async def journal_stub() -> dict[str, str]:
    return {"status": "not_implemented"}
