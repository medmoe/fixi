from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, computed_field

from src.app.services.minio_client import minio_client


class FileBase(BaseModel):
    """ Shared fields for File (excludes internal/DB-only fields) """
    original_file_name: Annotated[str, Field(max_length=255, examples=["myphoto.jpg"])]
    mime_type: Annotated[str, Field(max_length=255, examples=["image/jpeg"])]
    file_size: Annotated[int, Field(gt=0, examples=[1234])]
    model_config = ConfigDict(extra="forbid")


class FileCreate(FileBase):
    """ Fields required when creating a File entry (upload metadata)
    Should not include `id`, `uploaded_at`, `belongs_to_user_id` (handled internally)
    """
    belongs_to_user_id: Annotated[int, Field(examples=[42])]
    file_key: Annotated[str, Field(max_length=255, examples=["(uuid)/file_name.png"])]


class FileRead(FileBase):
    """ Fields returned by the API when reading a File includes DB-generated fields """
    id: Annotated[int, Field(examples=[1])]
    belongs_to_user_id: Annotated[int, Field(examples=[42])]
    uploaded_at: Annotated[datetime, Field(examples=["2023-01-01T00:00:00+00:00"])]
    file_key: Annotated[str, Field(max_length=255, examples=["(uuid)/file_name.png"])]
    is_deleted: Annotated[bool, Field(examples=[False])]
    deleted_at: Annotated[datetime | None, Field(examples=["2023-01-01T00:00:00+00:00"], default=None)]
    is_safe: Annotated[bool | None, Field(default=None)]
    is_processed: Annotated[bool | None, Field(default=None)]
    exif_stripped: Annotated[bool | None, Field(default=None)]
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    @computed_field
    def file_url(self) -> str:
        """ Generic url for file """
        return f"http://localhost:9000/{minio_client.bucket_uploads}/{self.file_key}"


class FileUpdate(BaseModel):
    """ Fields allowed to be updated by the user """
    original_file_name: Annotated[str | None, Field(max_length=255, examples=["myphoto.jpg"], default=None)] = None
    mime_type: Annotated[str | None, Field(max_length=255, examples=["image/jpeg"], default=None)] = None
    file_size: Annotated[int | None, Field(gt=0, examples=[1234], default=None)] = None
    model_config = ConfigDict(extra="forbid")


class FileUpdateInternal(FileUpdate):
    is_safe: Annotated[bool | None, Field(default=None)]
    is_processed: Annotated[bool | None, Field(default=None)]
    is_deleted: Annotated[bool, Field(default=False)] = False
    deleted_at: Annotated[datetime | None, Field(examples=["2023-01-01T00:00:00+00:00"], default=None)] = None
    model_config = ConfigDict(extra="forbid")


class FileDelete(BaseModel):
    pass
