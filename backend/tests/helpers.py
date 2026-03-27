import asyncio
from unittest.mock import AsyncMock, Mock

from httpx import AsyncClient


class ScalarResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class ExecuteResult:
    def __init__(self, *, one_or_none=None, one=None, rows=None):
        self._one_or_none = one_or_none
        self._one = one
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._one_or_none

    def scalar_one(self):
        return self._one

    def scalars(self):
        return ScalarResult(self._rows)


class FakeSession:
    def __init__(self, execute_results):
        self._execute_results = list(execute_results)
        self.add = Mock()
        self.flush = AsyncMock()
        self.commit = AsyncMock()
        self.close = AsyncMock()

    async def __aenter__(self):
        return self

    async def __aexit__(self, _exc_type, _exc, _tb):
        return False

    def begin(self):
        return self

    async def execute(self, _stmt):
        await asyncio.sleep(0)
        return self._execute_results.pop(0)


async def get_auth_headers(api_client: AsyncClient, create_user, email: str) -> dict[str, str]:
    await create_user(email=email, password="password123")
    login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
