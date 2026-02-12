from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..models.user import UserRole


class RegisterBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, Field(min_length=2, max_length=30)]
    username: Annotated[str, Field(min_length=2, max_length=20, pattern=r"^[a-z0-9]+$")]
    email: EmailStr
    password: Annotated[str, Field(min_length=8)]


class RegisterCustomer(RegisterBase):
    role: Literal[UserRole.CUSTOMER]
    saved_addresses: list[str] = Field(default_factory=list)
    loyalty_points: Annotated[int, Field(ge=0)] = 0


class RegisterHandyman(RegisterBase):
    role: Literal[UserRole.HANDYMAN]
    skill_category: Annotated[str, Field(min_length=2, max_length=120)]
    skills: list[str] = Field(default_factory=list)
    certification_urls: list[str] = Field(default_factory=list)
    hourly_rate: Annotated[float, Field(gt=0, le=10000)]
    availability: dict[str, Any] = Field(default_factory=dict)


RegisterRequest = Annotated[Union[RegisterCustomer, RegisterHandyman], Field(discriminator="role")]


class RegisterResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username_or_email: str
    password: str
