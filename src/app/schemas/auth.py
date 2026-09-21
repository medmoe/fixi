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
    role_type: UserRole


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username_or_email: Annotated[str, Field(max_length=255)]
    password: Annotated[str, Field(max_length=128)]


# E.164: a leading '+', 8-15 digits total, no leading zero after the '+'.
_E164_PATTERN = r"^\+[1-9]\d{7,14}$"


class OtpSendRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phone_number: Annotated[str, Field(pattern=_E164_PATTERN, examples=["+213555000000"])]


class OtpSendResponse(BaseModel):
    detail: str = "OTP sent"


class OtpVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phone_number: Annotated[str, Field(pattern=_E164_PATTERN, examples=["+213555000000"])]
    code: Annotated[str, Field(pattern=r"^\d{4,8}$", examples=["123456"])]


class OtpVerifyResponse(BaseModel):
    verified: bool
