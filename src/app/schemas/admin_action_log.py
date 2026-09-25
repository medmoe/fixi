from pydantic import BaseModel, ConfigDict

from ..core.schemas import TimestampSchema


class AdminActionLogBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: str
    target_type: str
    target_id: int
    actor_id: int | None = None
    reason: str | None = None


class AdminActionLogCreateInternal(AdminActionLogBase):
    pass


class AdminActionLogRead(TimestampSchema, AdminActionLogBase):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: int
