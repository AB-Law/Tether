from datetime import UTC, datetime
from enum import StrEnum

from app.core.exceptions import AppException


class EntryTypeEnum(StrEnum):
    IDEA = "idea"
    OBSERVATION = "observation"
    QUOTE = "quote"
    PLACE = "place"
    WANT = "want"
    TASK = "task"
    RANDOM_THOUGHT = "random_thought"


def validate_task_fields(data: dict) -> dict:
    entry_type = data.get("entry_type")
    if entry_type is not None:
        entry_type = str(entry_type)

    is_task = entry_type == EntryTypeEnum.TASK.value
    task_only_fields = ("due_date", "reminder_at", "is_completed")
    if not is_task:
        for field in task_only_fields:
            if data.get(field) is not None:
                raise AppException(
                    code="invalid_task_field",
                    message=f"{field} is only allowed for task entries",
                    status_code=422,
                )
        data["is_completed"] = False
        data["completed_at"] = None
    elif data.get("is_completed") is None:
        data["is_completed"] = False

    if data.get("completed_at") is not None and not data.get("is_completed", False):
        raise AppException(
            code="invalid_completed_at",
            message="completed_at requires is_completed=true",
            status_code=422,
        )
    if data.get("is_completed") and data.get("completed_at") is None:
        data["completed_at"] = datetime.now(UTC)

    return data
