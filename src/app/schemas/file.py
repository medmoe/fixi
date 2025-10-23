from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field


class FileBase(BaseModel):
    """ Shared fields for File (excludes internal/DB-only fields) """
    file_key: Annotated[str, Field(max_length=255, examples=["uploads/123e4567-e89b-12d3-a456-426614174000_myphoto.jpg"])]
    original_filename: Annotated[str, Field(max_length=255, examples=["myphoto.jpg"])]
    mime_type: Annotated[str, Field(max_length=255, examples=["image/jpeg"])]
    file_size: Annotated[int, Field(gt=0, examples=[1234])]
    is_processed: Optional[bool] = Field(default=False)
    is_safe: Optional[bool] = Field(default=False)
    exif_stripped: Optional[bool] = Field(default=False)

    model_config = ConfigDict(extra="forbid")


class FileCreate(FileBase):
    """ Fields required when creating a File entry (upload metadata)
    Should not include `id`, `uploaded_at`, `belongs_to_user_id` (handled internally)
    """
    pass


class FileRead(FileBase):
    """ Fields returned by the API when reading a File includes DB-generated fields """
    id: Annotated[int, Field(examples=[1])]
    belongs_to_user_id: Annotated[int, Field(examples=[42])]
    uploaded_at: Annotated[datetime, Field(examples=["2023-01-01T00:00:00+00:00"])]
    public_url: Annotated[str, Field(examples=["https://example.com/uploads/123e4567-e89b-12d3-a456-426614174000_myphoto.jpg"])]
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class FileUpdate(BaseModel):
    """ Fields allowed to be updated by the user (likely limited) """
    # For example, maybe admin can update only the is_safe flag
    is_safe: Optional[bool]
    is_processed: Optional[bool]
    model_config = ConfigDict(extra="forbid")


class FileDelete(BaseModel):
    """ Soft-delete schema """
    is_deleted: bool
    deleted_at: datetime

    model_config = ConfigDict(extra="forbid")
