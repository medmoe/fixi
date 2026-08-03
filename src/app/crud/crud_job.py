from fastcrud import FastCRUD
from sqlalchemy.ext.asyncio import AsyncSession
from fastcrud.exceptions.http_exceptions import BadRequestException, UnauthorizedException

from app.models import Job
from app.schemas.job import (
    JobCreateInternal,
    JobUpdate,
    JobRead,
)
from ..schemas.job import JobCreate


class CRUDJob(
    FastCRUD[
        Job,
        JobCreateInternal,
        JobUpdate,
        JobUpdate,
        JobRead,
        JobRead,
    ]
):
    async def create_job(
            self,
            db: AsyncSession,
            object: JobCreate,
            **kwargs
    ):
        data = object.model_dump(exclude_unset=True)
        user_id = kwargs.get("user_id")
        if not user_id:
            raise UnauthorizedException("You must be logged in to create a job")

        lat = data.pop("latitude", None)
        lng = data.pop("longitude", None)

        if lat is not None and lng is not None:
            data["location"] =






