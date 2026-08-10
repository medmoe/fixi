from typing import Annotated

from fastapi import APIRouter, Depends
from fastcrud import PaginatedListResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import ForbiddenException, NotFoundException
from ...crud.crud_jobs import crud_jobs
from ...models import Job, UserRole
from ...schemas.job import JobCreate, JobFilter, JobRead, JobUpdate
from ..dependencies import get_current_user

router = APIRouter(tags=["jobs"])


# ─── GET /jobs/{job_id} ─────────────────────────────────────────────────────────────
@router.get("/jobs/{job_id}", response_model=JobRead, status_code=200)
async def get_job(db: Annotated[AsyncSession, Depends(async_get_db)], job_id: int):
    """ Public endpoint to get a job by id."""
    stmt = (
        select(Job)
        .options(joinedload(Job.trade_category), joinedload(Job.user))
        .where(Job.id == job_id)
        .where(Job.is_deleted == False)  # noqa: E712
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if job is None:
        raise NotFoundException(f"Job with id {job_id} not found")

    return JobRead.model_validate(job)


# ─── POST /jobs ─────────────────────────────────────────────────────────────
@router.post("/jobs", response_model=JobRead, status_code=201)
async def create_job(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job: JobCreate,
        current_user: Annotated[dict, Depends(get_current_user)]
):
    """ private endpoint to create a job only for customers """

    if current_user['role_type'] != UserRole.CUSTOMER.value:
        raise ForbiddenException("Only customers can create jobs")

    return await crud_jobs.create_job(db=db, object=job, user_id=current_user["id"])


# ─── PATCH /jobs/{job_id} ─────────────────────────────────────────────────────────────
@router.patch("/jobs/{job_id}", response_model=JobRead, status_code=200)
async def update_job(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        payload: JobUpdate,
        current_user: Annotated[dict, Depends(get_current_user)]
):
    """ private endpoint to update a job — customers only and owner only """
    if current_user['role_type'] != UserRole.CUSTOMER.value:
        raise ForbiddenException("Only customers can update jobs")

    return await crud_jobs.update_job(db=db, object=payload, user_id=current_user["id"], job_id=job_id)


# ─── DELETE /jobs/{job_id} ─────────────────────────────────────────────────────────────
@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        current_user: Annotated[dict, Depends(get_current_user)]
):
    """ private endpoint to delete a job — customers only and owner only """

    if current_user['role_type'] != UserRole.CUSTOMER.value:
        raise ForbiddenException("Only customers can delete jobs")

    await crud_jobs.delete_job(db=db, user_id=current_user["id"], job_id=job_id)


@router.get("/jobs", response_model=PaginatedListResponse[JobRead], status_code=200)
async def get_jobs(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        filters: Annotated[JobFilter, Depends()],
        page: int = 1,
        page_size: int = 50,
):
    """ public endpoint to get jobs with pagination """
    offset = (page - 1) * page_size
    jobs = await crud_jobs.get_multi_jobs(db=db, filters=filters, offset=offset, limit=page_size)
    total = await crud_jobs.count_jobs(db=db, filters=filters)
    pages = (total + page_size - 1) // page_size

    return PaginatedListResponse(
        total_count=total,
        has_more=page < pages,
        page=page,
        items_per_page=page_size,
        data=jobs
    )
