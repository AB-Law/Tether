import json
import logging
from contextvars import ContextVar
from datetime import UTC, datetime

request_id_context: ContextVar[str] = ContextVar("request_id", default="")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "request_id": request_id_context.get(),
            "logger": record.name,
        }
        return json.dumps(payload)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
