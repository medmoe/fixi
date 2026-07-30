import re
from datetime import datetime
from typing import Annotated

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator, model_validator,
)
from pydantic.json_schema import SkipJsonSchema

from ..core.schemas import PersistentDeletion, UUIDSchema
from ..models.user import UserRole

#
# -------------------------------------------------------------------------
# Reusable field aliases
# -------------------------------------------------------------------------
#

Name = Annotated[
    str,
    Field(
        min_length=2,
        max_length=30,
        examples=["John Doe"],
    ),
]

Username = Annotated[
    str,
    Field(
        min_length=2,
        max_length=20,
        pattern=r"^[a-z][a-z0-9_]{1,19}$",
        examples=["john_doe"],
    ),
]

Location = Annotated[
    str | None,
    Field(
        default=None,
        max_length=100,
        examples=["POINT(-73.9857 40.7484)"],
    ),
]

Password = Annotated[
    str,
    Field(
        min_length=8,
        max_length=128,
        examples=["StrongP@ssw0rd"],
    ),
]

DisplayLocation = Annotated[
    str | None,
    Field(
        default=None,
        max_length=255,
        examples=["NY, New York City"]
    )
]


#
# -------------------------------------------------------------------------
# Base
# -------------------------------------------------------------------------
#

class UserBase(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )

    name: Name
    username: Username
    email: EmailStr
    location: Location = None
    display_location: DisplayLocation = None


#
# -------------------------------------------------------------------------
# Public output
# -------------------------------------------------------------------------
#

class UserRead(UserBase, UUIDSchema):
    id: int
    profile_image_url: str
    role_type: UserRole
    is_deleted: bool | None = None
    deleted_at: datetime | None = None
    updated_at: datetime | None = None
    created_at: datetime | None = None
    is_superuser: bool | None = None
    tier_id: int | None = None

    @field_validator("profile_image_url", mode="before")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            AnyHttpUrl(v)
        return v


class UserReadInternal(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    username: Username
    email: EmailStr
    role_type: UserRole
    token_version: int


#
# -------------------------------------------------------------------------
# Create
# -------------------------------------------------------------------------
#

class UserCreate(UserBase):
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        extra="forbid"
    )

    password: Password

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long.")

        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter.")

        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter.")

        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one digit.")

        if not re.search(r"[^A-Za-z\d]", value):
            raise ValueError("Password must contain at least one special character.")

        return value


class UserCreateInternal(UserBase):
    hashed_password: str
    role_type: UserRole = UserRole.CUSTOMER
    is_superuser: bool = False
    token_version: int = 1
    tier_id: int | None = None


#
# -------------------------------------------------------------------------
# Update
# -------------------------------------------------------------------------
#

class UserUpdate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
        use_enum_values=True,
    )
    name: Name | None = None
    username: Username | None = None
    email: EmailStr | None = None
    profile_image_url: str | None = None
    display_location: DisplayLocation = None
    latitude: Annotated[float, Field(ge=-90, le=90)] | None = None
    longitude: Annotated[float, Field(ge=-180, le=180)] | None = None

    @field_validator("profile_image_url", mode="before")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            AnyHttpUrl(v)
        return v

    @model_validator(mode="after")
    def validate_location_fields(self):
        values = (self.display_location, self.latitude, self.longitude)
        if not (all(v is None for v in values) or all(v is not None for v in values)):
            raise ValueError("display_location, latitude, and longitude must either all be provided or all be None.")
        return self


class UserUpdateInternal(UserUpdate):
    updated_at: datetime
    hashed_password: str | None = None
    is_deleted: bool | None = None
    deleted_at: datetime | None = None
    location: Location = None
    latitude: SkipJsonSchema[Annotated[float, Field(ge=-90, le=90)] | None] = Field(default=None, exclude=True)
    longitude: SkipJsonSchema[Annotated[float, Field(ge=-180, le=180)] | None] = Field(default=None, exclude=True)


#
# -------------------------------------------------------------------------
# Password update
# -------------------------------------------------------------------------
#

class UserPasswordUpdate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
    )
    current_password: str
    new_password: Password

    @field_validator("new_password", mode="before")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long.")

        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter.")

        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter.")

        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one digit.")

        if not re.search(r"[^A-Za-z\d]", value):
            raise ValueError("Password must contain at least one special character.")

        return value


#
# -------------------------------------------------------------------------
# Tier update
# -------------------------------------------------------------------------
#

class UserTierUpdate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        strict=True,
    )

    tier_id: Annotated[int, Field(gt=0)]


#
# -------------------------------------------------------------------------
# Admin update
# -------------------------------------------------------------------------
#

class UserAdminUpdate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        strict=True,
    )

    role_type: UserRole | None = None
    is_superuser: bool | None = None
    tier_id: Annotated[int | None, Field(gt=0)] = None


#
# -------------------------------------------------------------------------
# Soft delete
# -------------------------------------------------------------------------
#

class UserDeleteInternal(PersistentDeletion):
    pass


class UserRestoreDeleted(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        strict=True,
    )

    pass
