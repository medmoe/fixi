from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    user_id: int
    type: str
    title_ar: str
    title_fr: str
    title_en: str
    body_ar: str
    body_fr: str
    body_en: str
    related_job_id: int | None = None


class NotificationCreateInternal(NotificationBase):
    """Server-only -- notifications are never created directly by a client,
    only by NotificationService when an event's channels include IN_APP."""
    pass


class NotificationRead(NotificationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    read_at: datetime | None = None
    created_at: datetime


class NotificationReadUpdateInternal(BaseModel):
    """Marks a notification read -- the only mutation a client can trigger."""
    read_at: datetime
