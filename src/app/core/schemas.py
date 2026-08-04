import uuid as uuid_pkg
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field, field_serializer, model_validator
from pydantic.json_schema import SkipJsonSchema
from uuid6 import uuid7


class HealthCheck(BaseModel):
    name: str
    version: str
    description: str


# -------------- mixins --------------
class UUIDSchema(BaseModel):
    uuid: uuid_pkg.UUID = Field(default_factory=uuid7)


class TimestampSchema(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
    updated_at: datetime | None = Field(default=None)

    @field_serializer("created_at")
    def serialize_dt(self, created_at: datetime | None, _info: Any) -> str | None:
        if created_at is not None:
            return created_at.isoformat()

        return None

    @field_serializer("updated_at")
    def serialize_updated_at(self, updated_at: datetime | None, _info: Any) -> str | None:
        if updated_at is not None:
            return updated_at.isoformat()

        return None


class PersistentDeletion(BaseModel):
    deleted_at: datetime | None = Field(default=None)
    is_deleted: bool = False

    @field_serializer("deleted_at")
    def serialize_dates(self, deleted_at: datetime | None, _info: Any) -> str | None:
        if deleted_at is not None:
            return deleted_at.isoformat()

        return None


# -------------- token --------------
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username_or_email: str
    role: str | None = None
    token_version: int | None = None


class TokenBlacklistBase(BaseModel):
    token: str
    expires_at: datetime


class TokenBlacklistRead(TokenBlacklistBase):
    id: int


class TokenBlacklistCreate(TokenBlacklistBase):
    pass


class TokenBlacklistUpdate(TokenBlacklistBase):
    pass


# ————— Location ———————————————————————————————————————————————————————————————————————————————————————————————————
class LocationBuilderMixin(BaseModel):
    """Converts lat/lng to WKT POINT string for PostGIS storage."""
    latitude: SkipJsonSchema[float | None] = Field(default=None, exclude=True)
    longitude: SkipJsonSchema[float | None] = Field(default=None, exclude=True)

    @model_validator(mode='after')
    def build_location(self):
        lat, lon = self.latitude, self.longitude
        if (lat is None) != (lon is None):
            raise ValueError("Both latitude and longitude must be provided together.")
        if lat is not None and lon is not None:
            self.location = f"POINT({lon} {lat})"
        return self