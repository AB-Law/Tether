import os
import secrets
from collections.abc import AsyncGenerator, Iterator
from datetime import UTC, date, datetime

import pytest
import pytest_asyncio
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

from alembic import command

os.environ.setdefault("APP_SECRET_KEY", "integration-test-secret")
os.environ.setdefault("ANTHROPIC_API_KEY", "integration-test-anthropic")

ASYNC_PG_PREFIX = "postgresql+asyncpg://"


def _asyncpg_url(url: str) -> str:
    if url.startswith(ASYNC_PG_PREFIX):
        return url
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", ASYNC_PG_PREFIX, 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", ASYNC_PG_PREFIX, 1)
    raise ValueError(f"Unsupported postgres URL format: {url}")


@pytest.fixture(scope="session")
def test_database_url() -> Iterator[str]:
    explicit_url = os.getenv("INTEGRATION_TEST_DATABASE_URL")
    if explicit_url:
        yield _asyncpg_url(explicit_url)
        return

    db_user = os.getenv("INTEGRATION_TEST_DB_USER", "tether")
    db_password = os.getenv("INTEGRATION_TEST_DB_PASSWORD") or secrets.token_urlsafe(24)
    with PostgresContainer(
        "postgres:16",
        username=db_user,
        password=db_password,
        dbname="tether_test",
    ) as pg:
        yield _asyncpg_url(pg.get_connection_url())


@pytest.fixture(scope="session", autouse=True)
def migrated_db(test_database_url: str) -> None:
    os.environ["DATABASE_URL"] = test_database_url
    os.environ["APP_ENV"] = "test"

    alembic_ini_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "alembic.ini")
    )
    alembic_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "alembic"))

    config = Config(alembic_ini_path)
    config.set_main_option("script_location", alembic_dir)
    command.upgrade(config, "head")


@pytest_asyncio.fixture
async def session_factory(
    test_database_url: str, migrated_db: None
) -> AsyncGenerator[async_sessionmaker[AsyncSession], None]:
    engine = create_async_engine(test_database_url, future=True)
    try:
        yield async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def clean_db(session_factory: async_sessionmaker[AsyncSession]) -> AsyncGenerator[None, None]:
    async with session_factory() as session:
        table_names = (
            (
                await session.execute(
                    text(
                        "SELECT tablename FROM pg_tables "
                        "WHERE schemaname = 'public' AND tablename <> 'alembic_version'"
                    )
                )
            )
            .scalars()
            .all()
        )
        if table_names:
            quoted = ", ".join(f'"{table_name}"' for table_name in table_names)
            await session.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))
            await session.commit()
    yield


@pytest_asyncio.fixture
async def db_session(
    session_factory: async_sessionmaker[AsyncSession], clean_db: None
) -> AsyncGenerator[AsyncSession, None]:
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def api_client(
    session_factory: async_sessionmaker[AsyncSession], clean_db: None
) -> AsyncGenerator[AsyncClient, None]:
    from app.api import deps
    from app.api.v1.endpoints import health
    from app.main import app

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[deps.get_db] = override_get_db
    app.dependency_overrides[health.get_db_session] = override_get_db
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
            follow_redirects=True,
        ) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def create_user(db_session: AsyncSession):
    from app.core.security import hash_password
    from app.repositories import user_repository

    async def _create(
        email: str = "integration@example.com",
        password: str = "password123",
        display_name: str | None = "Integration User",
    ):
        user = await user_repository.create(
            email=email,
            password_hash=hash_password(password),
            display_name=display_name,
            db=db_session,
        )
        await db_session.commit()
        return user

    return _create


@pytest_asyncio.fixture
async def auth_headers(api_client: AsyncClient, create_user):
    email = f"user-{datetime.now(UTC).timestamp()}@example.com"
    password = "password123"
    await create_user(email=email, password=password)
    login = await api_client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def today_str() -> str:
    return date.today().isoformat()
