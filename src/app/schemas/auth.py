from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from ..models.user import UserRole


class RegisterBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, Field(min_length=2, max_length=30, pattern=r"^[a-zA-Z\s]+$")]
    username: Annotated[str, Field(min_length=2, max_length=20, pattern=r"^[a-z0-9][a-z0-9_]*[a-z0-9]$")]
    email: EmailStr
    password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class RegisterCustomer(RegisterBase):
    role_type: Literal['customer']


class RegisterWorker(RegisterBase):
    role_type: Literal['worker']


RegisterRequest = Annotated[Union[RegisterCustomer, RegisterWorker], Field(discriminator="role_type")]


class RegisterResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username_or_email: Annotated[str, Field(min_length=3, max_length=255)]
    password: Annotated[str, Field(min_length=8, max_length=128)]
