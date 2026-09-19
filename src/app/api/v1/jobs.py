from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastcrud import PaginatedListResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import BadRequestException, ForbiddenException, NotFoundException
from ...crud.crud_job_applications import crud_job_application
from ...crud.crud_jobs import crud_jobs
from ...crud.crud_reviews import crud_reviews
from ...crud.crud_worker_profiles import crud_worker_profiles
from ...models import Job, JobApplication, UserRole
from ...schemas.job import JobCreate, JobFilter, JobRead, JobUpdate
from ...schemas.job_application import JobApplicationCreate, JobApplicationRead, JobApplicationUpdate, JobApplicationWithdrawRequest
from ...schemas.review import ReviewCreateRequest, ReviewEligibility, ReviewSubmitResponse
from ...schemas.utils import parse_wkt_point
from ...schemas.worker_profile import WorkerProfileFilter, WorkerProfileWithTradesRead, WorkerSortBy
from ...services.job_lifecycle_service import confirm_application, mark_job_complete, start_job, withdraw_application
from ...services.review_eligibility_service import check_review_eligibility
from ..dependencies import get_current_user

router = APIRouter(tags=["jobs"])


# ─── helpers ─────────────────────────────────────────────────────────────
async def _build_paginated_jobs_response(
        db: AsyncSession,
        filters: JobFilter,
        page: int = 1,
        page_size: int = 50,
) -> PaginatedListResponse[JobRead]:
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


async def _get_job_and_application(db: AsyncSession, job_id: int, app_id: int) -> tuple[Job, JobApplication]:
    job = await db.get(Job, job_id)
    if job is None:
        raise NotFoundException(f"Job with id {job_id} not found")

    application = await db.get(JobApplication, app_id)
    if application is None or application.job_id != job_id:
        raise NotFoundException(f"Job application with id {app_id} not found")

    return job, application


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


# ─── GET /jobs ────────────────────────────────────────────────────────────────────────────────────────────────────
@router.get("/jobs", response_model=PaginatedListResponse[JobRead], status_code=200)
async def get_jobs(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        filters: Annotated[JobFilter, Depends()],
        page: int = 1,
        page_size: int = 50
):
    """ public endpoint to get jobs with pagination """
    return await _build_paginated_jobs_response(db=db, filters=filters, page=page, page_size=page_size)


# ─── GET /jobs/my ────────────────────────────────────────────────────────────────────────────────────────────────────
@router.get("/jobs/my", response_model=PaginatedListResponse[JobRead], status_code=200)
async def get_my_jobs(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
        page: int = 1,
        page_size: int = 50,
) -> PaginatedListResponse[JobRead]:
    """ private endpoint that retrieves posted jobs of the current customer user """

    if current_user["role_type"] != UserRole.CUSTOMER.value:
        raise ForbiddenException("Only customers can access this endpoint")
    filters = JobFilter(user_id=current_user['id'])
    return await _build_paginated_jobs_response(db=db, filters=filters, page=page, page_size=page_size)


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


# ─── GET /jobs/{job_id}/review-status ──────────────────────────────────────
@router.get("/jobs/{job_id}/review-status", response_model=ReviewEligibility, status_code=200)
async def get_job_review_status(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
) -> ReviewEligibility:
    """
    Lightweight poll endpoint so the frontend can show/hide the review CTA
    without attempting a real submission. Runs the same three guards the
    review-submission endpoint enforces, read-only.
    """
    job = await db.get(Job, job_id)
    if job is None:
        raise NotFoundException(f"Job with id {job_id} not found")

    return await check_review_eligibility(db=db, job=job, user_id=current_user["id"])


# ─── POST /jobs/{job_id}/reviews ────────────────────────────────────────────
@router.post("/jobs/{job_id}/reviews", response_model=ReviewSubmitResponse, status_code=201)
async def submit_job_review(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        payload: ReviewCreateRequest,
        current_user: Annotated[dict, Depends(get_current_user)],
) -> ReviewSubmitResponse:
    """
    Submit a review for a completed job — either direction (customer ->
    worker or worker -> customer), inferred from the caller's relationship
    to the job rather than taken from the request body. Enforces the same
    three guards as GET .../review-status, then persists the review and
    (when reviewing a worker) recalculates their rating snapshot in one
    transaction.
    """
    job = await db.get(Job, job_id)
    if job is None:
        raise NotFoundException(f"Job with id {job_id} not found")

    return await crud_reviews.submit_review(db=db, job=job, user_id=current_user["id"], payload=payload)


# ─── PATCH /jobs/{job_id} ───────────────────────────────────────────────────────────────────────────────────────
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


# ─── DELETE /jobs/{job_id} ───────────────────────────────────────────────────────────────────────────────────────
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


# ─── POST /jobs/{job_id}/apply ──────────────────────────────────────────────
@router.post("/jobs/{job_id}/apply", response_model=JobApplicationRead, status_code=201)
async def create_job_application(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
        payload: JobApplicationCreate,
) -> JobApplicationRead:
    if current_user["role_type"] != UserRole.WORKER.value:
        raise ForbiddenException("Only workers can apply to jobs")
    return await crud_job_application.create_job_application(
        db=db, object=payload, job_id=job_id, user_id=current_user["id"]
    )


# ─── GET /jobs/{job_id}/applications ────────────────────────────────────────
@router.get("/jobs/{job_id}/applications", response_model=PaginatedListResponse[JobApplicationRead], status_code=200)
async def get_job_applications(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
        page: int = 1,
        page_size: int = 50,
) -> PaginatedListResponse[JobApplicationRead]:
    if current_user["role_type"] != UserRole.CUSTOMER.value:
        raise ForbiddenException("Only customers can access this endpoint")

    offset = (page - 1) * page_size
    applications, total_count = await crud_job_application.get_job_applications(
        db=db,
        db_job_id=job_id,
        user_id=current_user["id"],
        offset=offset,
        limit=page_size,
    )
    pages = (total_count + page_size - 1) // page_size if page_size else 1

    return PaginatedListResponse(
        data=applications,
        total_count=total_count,
        page=page,
        items_per_page=page_size,
        has_more=page < pages,
    )


# ─── GET /jobs/{job_id}/nearby-workers ────────────────────────────────────────────────────────────────────────────────────────────
@router.get(
    "/jobs/{job_id}/nearby-workers",
    response_model=PaginatedListResponse[WorkerProfileWithTradesRead],
    status_code=200,
)
async def get_nearby_workers(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
        offset: int = Query(0, ge=0, description="Pagination offset"),
        limit: int = Query(20, ge=1, le=100, description="Pagination limit"),
) -> PaginatedListResponse[WorkerProfileWithTradesRead]:
    """
    Suggests nearby, available workers for a job — owner only. Uses the
    job's own stored location as the search center and its trade_category_id
    as an automatic filter. Results are sorted by distance and respect each
    worker's own service_radius_km (via the existing geo search machinery).
    """
    job = await db.get(Job, job_id)
    if job is None:
        raise NotFoundException(f"Job with id {job_id} not found")
    if job.user_id != current_user["id"]:
        raise ForbiddenException("Only the owner of this job can view nearby workers")
    if job.location is None:
        raise BadRequestException("This job has no location set — cannot search for nearby workers")

    longitude, latitude = parse_wkt_point(job.location)

    filters = WorkerProfileFilter(
        trade_category_id=job.trade_category_id,  # None is fine — no category filter applied
        latitude=latitude,
        longitude=longitude,
        is_available=True,
        sort_by=WorkerSortBy.distance,
    )

    return await crud_worker_profiles.search_workers(db=db, filters=filters, offset=offset, limit=limit)


# ─── PATCH /jobs/{job_id}/applications/{app_id} ────────────────────────────────────────────────────────────────────────────────────────────
@router.patch("/jobs/{job_id}/applications/{app_id}", response_model=JobApplicationRead, status_code=200)
async def update_job_application(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        app_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
        payload: JobApplicationUpdate,
) -> JobApplicationRead:
    if current_user["role_type"] != UserRole.CUSTOMER.value:
        raise ForbiddenException("Only customers can access this endpoint")
    return await crud_job_application.update_job_application(
        db=db, job_id=job_id, app_id=app_id, user_id=current_user["id"], object=payload
    )


# ─── POST /jobs/{job_id}/applications/{app_id}/confirm ─────────────────────
@router.post("/jobs/{job_id}/applications/{app_id}/confirm", response_model=JobApplicationRead, status_code=200)
async def confirm_job_application(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        app_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
) -> JobApplicationRead:
    """
    The worker's half of the mutual assignment handshake, after the customer
    has already accepted them (and, implicitly, after the two have discussed
    and agreed offline). Moves the job to ASSIGNED and auto-rejects every
    other application on it.
    """
    job, application = await _get_job_and_application(db, job_id, app_id)
    return await confirm_application(db=db, job=job, application=application, user_id=current_user["id"])


# ─── POST /jobs/{job_id}/applications/{app_id}/withdraw ────────────────────
@router.post("/jobs/{job_id}/applications/{app_id}/withdraw", response_model=JobApplicationRead, status_code=200)
async def withdraw_job_application(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        app_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
        payload: JobApplicationWithdrawRequest,
) -> JobApplicationRead:
    """Worker-facing — retract their own application (pending, or accepted
    but not yet mutually confirmed). Requires a reason, same as a customer's rejection."""
    job, application = await _get_job_and_application(db, job_id, app_id)
    return await withdraw_application(
        db=db, job=job, application=application, user_id=current_user["id"], reason=payload.decline_reason
    )


# ─── POST /jobs/{job_id}/start ──────────────────────────────────────────────
@router.post("/jobs/{job_id}/start", response_model=JobRead, status_code=200)
async def start_job_endpoint(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
) -> JobRead:
    """Worker marks the assigned job as started."""
    job = await db.get(Job, job_id)
    if job is None:
        raise NotFoundException(f"Job with id {job_id} not found")

    return await start_job(db=db, job=job, user_id=current_user["id"])


# ─── POST /jobs/{job_id}/complete ───────────────────────────────────────────
@router.post("/jobs/{job_id}/complete", response_model=JobRead, status_code=200)
async def complete_job_endpoint(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        job_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
) -> JobRead:
    """
    Either participant marks their side of the job as done — the job only
    flips to COMPLETED once both the customer and the worker have.
    """
    job = await db.get(Job, job_id)
    if job is None:
        raise NotFoundException(f"Job with id {job_id} not found")

    return await mark_job_complete(db=db, job=job, user_id=current_user["id"])
