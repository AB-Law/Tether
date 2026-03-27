import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_and_ready(api_client: AsyncClient) -> None:
    health = await api_client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}

    ready = await api_client.get("/api/v1/ready")
    assert ready.status_code == 200
    assert ready.json() == {"status": "ready"}
