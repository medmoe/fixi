from pydantic import BaseModel, ConfigDict

from ..models.notification_log import NotificationChannel


class NotificationPreferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_type: str
    channel: NotificationChannel
    enabled: bool


class NotificationPreferenceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: str
    channel: NotificationChannel
    enabled: bool


class NotificationPreferenceCreateInternal(BaseModel):
    user_id: int
    event_type: str
    channel: NotificationChannel
    enabled: bool


class NotificationPreferenceUpdateInternal(BaseModel):
    enabled: bool


class NotificationPreferenceDelete(BaseModel):
    pass
