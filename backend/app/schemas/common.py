from pydantic import BaseModel


class NotImplementedResponse(BaseModel):
    status: str = "not_implemented"
