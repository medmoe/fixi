from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class ServiceCategoryBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=120, examples=["Plumbing"])]
    description: Annotated[str | None, Field(max_length=500, default=None)]


class ServiceCategoryCreate(ServiceCategoryBase):
    model_config = ConfigDict(extra="forbid")


class ServiceCategoryRead(ServiceCategoryBase):
    id: int
