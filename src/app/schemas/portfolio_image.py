from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, ConfigDict, field_validator, AnyHttpUrl


class PortfolioImageBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    worker_profile_id: int
    image_url: Annotated[str, Field(max_length=255, examples=["https://example.com/image.jpg"])]

    @field_validator("image_url", mode="before")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            AnyHttpUrl(v)
        return v


class PortfolioImageCreate(PortfolioImageBase):
    pass


class PortfolioImageRead(PortfolioImageBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None


class PortfolioImageUpdate(PortfolioImageBase):
    pass


class PortfolioImageDelete(PortfolioImageBase):
    pass


class PortfolioImageInternalUpdate(PortfolioImageBase):
    pass
