from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class TradeCategoryBase(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: Annotated[str, Field(max_length=50)]
    display_name: Annotated[str, Field(max_length=50)]
    display_name_ar: Annotated[str | None, Field(max_length=50, default=None)]
    display_name_fr: Annotated[str | None, Field(max_length=50, default=None)]
    icon_name: Annotated[str | None, Field(max_length=50, default=None)]
    parent_id: Annotated[int | None, Field(default=None)]


class TradeCategoryCreate(TradeCategoryBase):
    pass


class TradeCategoryUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: Annotated[str | None, Field(max_length=50, default=None)]
    display_name: Annotated[str | None, Field(max_length=50, default=None)]
    display_name_ar: Annotated[str | None, Field(max_length=50, default=None)]
    display_name_fr: Annotated[str | None, Field(max_length=50, default=None)]
    icon_name: Annotated[str | None, Field(max_length=50, default=None)]
    parent_id: Annotated[int | None, Field(default=None)]


class TradeCategoryUpdateInternal(TradeCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None


class TradeCategoryRead(TradeCategoryBase):
    model_config = ConfigDict(extra='forbid', from_attributes=True)
    id: int
    created_at: datetime | None = None


class TradeCategoryDelete(BaseModel):
    """Soft delete schema."""
    model_config = ConfigDict(extra='forbid')
    is_deleted: bool = True
    deleted_at: datetime | None = None


class TradeCategoryWithChildren(TradeCategoryRead):
    """TradeCategoryRead with nested children."""
    children: list["TradeCategoryWithChildren"] = []  # recursive — children can have children

    model_config = ConfigDict(extra="forbid", from_attributes=True)


TradeCategoryWithChildren.model_rebuild()  # ✅ required for self-referential schemas
