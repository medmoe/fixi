from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ServiceCategoryBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=120, examples=["Plumbing"])]
    description: Annotated[str | None, Field(max_length=500, default=None)]

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_name(cls, value: str) -> str:
        return " ".join(value.strip().split())


class ServiceCategoryCreate(ServiceCategoryBase):
    model_config = ConfigDict(extra="forbid")


class ServiceCategoryRead(ServiceCategoryBase):
    id: int


class ServiceCategoryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str | None, Field(min_length=2, max_length=120, default=None, examples=['Plumbing'])]
    description: Annotated[str | None, Field(max_length=500, default=None)]


class ServiceCategoryUpdateInternal(ServiceCategoryUpdate):
    pass


class ServiceCategoryDelete(BaseModel):
    pass
