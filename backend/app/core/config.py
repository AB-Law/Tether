from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    # Phase 0 does not call external AI services yet, so allow local/dev boot
    # without requiring AI/secret values to be present in the environment.
    #
    # In production, override these via real environment injection (1Password / secrets).
    app_secret_key: str = "dev-change-me"
    database_url: str = "postgresql+asyncpg://tether:${DATABASE_PASSWORD}@localhost:5432/tether"
    anthropic_api_key: str = "dev-anthropic"
    # When set, Anthropic API clients should use this base URL.
    # Example: LM Studio local Anthropic-compatible server.
    anthropic_base_url: str | None = None
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    cors_origin_regex: str | None = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
