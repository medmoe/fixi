from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from ...api.dependencies import get_current_superuser, get_current_user, require_role
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import (
    BadRequestException,
    DuplicateValueException,
    ForbiddenException,
    NotFoundException,
)
from ...models.job import Job, JobStatus
from ...models.review import Review
from ...models.service_category import ServiceCategory
from ...models.user import User, UserRole
from ...schemas.geo import NearbyJobRead, WorkerNearbyRead
from ...schemas.job import JobAssign, JobCreate, JobRead, JobStatusUpdate
from ...schemas.review import ReviewCreate, ReviewRead
from ...schemas.service_category import ServiceCategoryCreate, ServiceCategoryRead

router = APIRouter(tags=["marketplace"])


def _to_service_category_read(model: ServiceCategory) -> ServiceCategoryRead:
    return ServiceCategoryRead(id=model.id, name=model.name, description=model.description)


def _to_job_read(model: Job) -> JobRead:
    return JobRead(
        id=model.id,
        service_category_id=model.service_category_id,
        customer_id=model.customer_id,
        worker_id=model.worker_id,
        title=model.title,
        description=model.description,
        status=model.status,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _to_review_read(model: Review) -> ReviewRead:
    return ReviewRead(id=model.id, job_id=model.job_id, rating=model.rating, comment=model.comment, created_at=model.created_at)


async def _get_active_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    return result.scalar_one_or_none()


@router.post("/service-categories", response_model=ServiceCategoryRead, status_code=201)
async def create_service_category(
    request: Request,
    payload: ServiceCategoryCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    _: Annotated[dict, Depends(get_current_superuser)],
) -> ServiceCategoryRead:
    exists_result = await db.execute(select(ServiceCategory).where(ServiceCategory.name == payload.name))
    if exists_result.scalar_one_or_none() is not None:
        raise DuplicateValueException("Service category name already exists")

    category = ServiceCategory(name=payload.name, description=payload.description)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return _to_service_category_read(category)


@router.get("/service-categories", response_model=list[ServiceCategoryRead])
async def list_service_categories(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[ServiceCategoryRead]:
    result = await db.execute(select(ServiceCategory).order_by(ServiceCategory.name))
    return [_to_service_category_read(row) for row in result.scalars().all()]


@router.post("/jobs", response_model=JobRead, status_code=201, dependencies=[Depends(require_role(UserRole.CUSTOMER.value))])
async def create_job(
    request: Request,
    payload: JobCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> JobRead:
    if payload.service_category_id is not None:
        category_result = await db.execute(select(ServiceCategory).where(ServiceCategory.id == payload.service_category_id))
        if category_result.scalar_one_or_none() is None:
            raise NotFoundException("Service category not found")

    if payload.worker_id is not None:
        worker_user = await _get_active_user_by_id(db, payload.worker_id)
        if worker_user is None:
            raise NotFoundException("Worker user not found")
        if worker_user.role_type != UserRole.HANDYMAN:
            raise BadRequestException("Selected worker_id does not belong to a worker/handyman account")

    job = Job(
        service_category_id=payload.service_category_id,
        customer_id=current_user["id"],
        worker_id=payload.worker_id,
        title=payload.title,
        description=payload.description,
        status=JobStatus.ASSIGNED if payload.worker_id else JobStatus.OPEN,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return _to_job_read(job)


@router.get("/jobs/me", response_model=list[JobRead])
async def list_my_jobs(
    request: Request,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[JobRead]:
    if current_user.get("is_superuser"):
        result = await db.execute(select(Job).order_by(Job.id.desc()))
    else:
        result = await db.execute(
            select(Job)
            .where(or_(Job.customer_id == current_user["id"], Job.worker_id == current_user["id"]))
            .order_by(Job.id.desc())
        )
    return [_to_job_read(row) for row in result.scalars().all()]


@router.get("/jobs/{job_id:int}", response_model=JobRead)
async def get_job(
    request: Request,
    job_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> JobRead:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise NotFoundException("Job not found")

    if not current_user.get("is_superuser") and current_user["id"] not in {job.customer_id, job.worker_id}:
        raise ForbiddenException("You do not have access to this job")

    return _to_job_read(job)


@router.patch("/jobs/{job_id:int}/assign", response_model=JobRead)
async def assign_job(
    request: Request,
    job_id: int,
    payload: JobAssign,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> JobRead:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise NotFoundException("Job not found")

    if not current_user.get("is_superuser") and job.customer_id != current_user["id"]:
        raise ForbiddenException("Only the customer who created this job can assign a worker")

    worker_user = await _get_active_user_by_id(db, payload.worker_id)
    if worker_user is None:
        raise NotFoundException("Worker user not found")
    if worker_user.role_type != UserRole.HANDYMAN:
        raise BadRequestException("Selected worker_id does not belong to a worker/handyman account")

    job.worker_id = payload.worker_id
    if job.status == JobStatus.OPEN:
        job.status = JobStatus.ASSIGNED

    await db.commit()
    await db.refresh(job)
    return _to_job_read(job)


@router.patch("/jobs/{job_id:int}/status", response_model=JobRead)
async def update_job_status(
    request: Request,
    job_id: int,
    payload: JobStatusUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> JobRead:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise NotFoundException("Job not found")

    allowed_ids = {job.customer_id, job.worker_id}
    if not current_user.get("is_superuser") and current_user["id"] not in allowed_ids:
        raise ForbiddenException("You do not have permission to update this job")

    job.status = payload.status
    await db.commit()
    await db.refresh(job)
    return _to_job_read(job)


@router.post("/jobs/{job_id:int}/review", response_model=ReviewRead, status_code=201)
async def create_job_review(
    request: Request,
    job_id: int,
    payload: ReviewCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ReviewRead:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise NotFoundException("Job not found")

    if job.customer_id != current_user["id"]:
        raise ForbiddenException("Only the customer who owns the job can review it")
    if job.status != JobStatus.COMPLETED:
        raise BadRequestException("Only completed jobs can be reviewed")

    existing_result = await db.execute(select(Review).where(Review.job_id == job.id))
    if existing_result.scalar_one_or_none() is not None:
        raise DuplicateValueException("A review already exists for this job")

    review = Review(job_id=job.id, rating=payload.rating, comment=payload.comment)
    db.add(review)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise BadRequestException("Failed to create review due to integrity constraints") from exc

    await db.refresh(review)
    return _to_review_read(review)


@router.get("/jobs/{job_id:int}/review", response_model=ReviewRead)
async def get_job_review(
    request: Request,
    job_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ReviewRead:
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if job is None:
        raise NotFoundException("Job not found")

    if not current_user.get("is_superuser") and current_user["id"] not in {job.customer_id, job.worker_id}:
        raise ForbiddenException("You do not have access to this review")

    review_result = await db.execute(select(Review).where(Review.job_id == job_id))
    review = review_result.scalar_one_or_none()
    if review is None:
        raise NotFoundException("Review not found")
    return _to_review_read(review)


@router.get("/workers/nearby", response_model=list[WorkerNearbyRead])
async def get_nearby_workers(
    request: Request,
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    radius_km: Annotated[float, Query(gt=0, le=200)] = 10,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[WorkerNearbyRead]:
    reference_point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
    distance_m = func.ST_DistanceSphere(User.location, reference_point)

    query = (
        select(
            User.id.label("user_id"),
            User.username,
            User.bio,
            User.location,
            (distance_m / 1000.0).label("distance_km"),
        )
        .where(
            User.is_deleted.is_(False),
            User.role_type == UserRole.HANDYMAN,
            User.location.is_not(None),
            distance_m <= radius_km * 1000.0,
        )
        .order_by(distance_m.asc())
        .limit(limit)
    )

    result = await db.execute(query)
    return [
        WorkerNearbyRead(
            user_id=row.user_id,
            username=row.username,
            bio=row.bio,
            location=row.location,
            distance_km=float(row.distance_km),
        )
        for row in result.all()
    ]


@router.get(
    "/jobs/nearby",
    response_model=list[NearbyJobRead],
    dependencies=[Depends(require_role(UserRole.HANDYMAN.value, UserRole.CUSTOMER.value))],
)
async def get_nearby_jobs(
    request: Request,
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    radius_km: Annotated[float, Query(gt=0, le=200)] = 10,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    status: JobStatus = JobStatus.OPEN,
) -> list[NearbyJobRead]:
    customer = aliased(User)
    reference_point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
    distance_m = func.ST_DistanceSphere(customer.location, reference_point)

    query = (
        select(
            Job.id.label("job_id"),
            Job.title,
            Job.description,
            Job.status,
            customer.id.label("customer_id"),
            customer.username.label("customer_username"),
            customer.location.label("customer_location"),
            (distance_m / 1000.0).label("distance_km"),
        )
        .join(customer, Job.customer_id == customer.id)
        .where(
            customer.is_deleted.is_(False),
            customer.location.is_not(None),
            Job.status == status,
            distance_m <= radius_km * 1000.0,
        )
        .order_by(distance_m.asc())
        .limit(limit)
    )

    result = await db.execute(query)
    return [
        NearbyJobRead(
            job_id=row.job_id,
            title=row.title,
            description=row.description,
            status=row.status.value if hasattr(row.status, "value") else str(row.status),
            customer_id=row.customer_id,
            customer_username=row.customer_username,
            customer_location=row.customer_location,
            distance_km=float(row.distance_km),
        )
        for row in result.all()
    ]
