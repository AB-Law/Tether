import logging

import pytest

from app.core import exceptions, security
from app.core import logging as app_logging
from tests.helpers import FakeSession


@pytest.mark.asyncio
async def test_security_logging_and_database_helpers(monkeypatch):
    pw_hash = security.hash_password("abc123")
    assert security.verify_password("abc123", pw_hash) is True
    token = security.create_access_token("123")
    payload = security.decode_access_token(token)
    assert payload["sub"] == "123"
    with pytest.raises(exceptions.AppException):
        security.decode_access_token("bad-token")
    rt = security.generate_refresh_token()
    assert security.hash_refresh_token(rt) != ""
    app_logging.request_id_context.set("rid")
    formatter = app_logging.JsonFormatter()
    rec = logging.makeLogRecord({"name": "x", "msg": "hello", "levelname": "INFO", "extra_key": 3})
    out = formatter.format(rec)
    assert '"request_id": "rid"' in out
    assert '"extra_key": "3"' in out
    app_logging.configure_logging()
    assert app_logging.get_logger("abc").name == "abc"
    fake_session = FakeSession([])
    monkeypatch.setattr("app.core.database.AsyncSessionLocal", lambda: fake_session)
    from app.core.database import get_db_session

    async for yielded in get_db_session():
        assert yielded is fake_session
    fake_session.close.assert_awaited_once()
