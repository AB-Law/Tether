import asyncio
from unittest.mock import AsyncMock, Mock


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

    async def execute(self, _stmt):
        await asyncio.sleep(0)
        return self._execute_results.pop(0)
