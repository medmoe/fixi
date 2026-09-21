from datetime import datetime

from pydantic import BaseModel, ConfigDict

from ..models.device_token import DevicePlatform


class DeviceTokenCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str
    platform: DevicePlatform


class DeviceTokenCreateInternal(DeviceTokenCreate):
    user_id: int
    last_seen: datetime


class DeviceTokenUpdateInternal(BaseModel):
    user_id: int
    platform: DevicePlatform
    last_seen: datetime


class DeviceTokenRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    token: str
    platform: DevicePlatform
    last_seen: datetime
