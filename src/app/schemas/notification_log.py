from pydantic import BaseModel

from ..core.schemas import TimestampSchema
from ..models.notification_log import NotificationChannel, NotificationLogStatus


class NotificationLogBase(BaseModel):
    event_type: str
    channel: NotificationChannel
    provider: str
    status: NotificationLogStatus
    error: str | None = None


class NotificationLogCreateInternal(NotificationLogBase):
    pass


class NotificationLogRead(TimestampSchema, NotificationLogBase):
    id: int


class NotificationFailureRateRead(BaseModel):
    channel: NotificationChannel
    provider: str
    sent: int
    failed: int
    skipped: int
    attempted: int
    failure_rate: float | None
