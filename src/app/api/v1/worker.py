from typing import Annotated, cast

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user, require_role
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import (
    BadRequestException,
    DuplicateValueException,
    ForbiddenException,
    NotFoundException,
)
from ...core.utils.cache import cache
from ...crud.crud_users import crud_users
from ...crud.crud_worker import crud_workers
from ...models import TradeCategory, UserRole
from ...schemas.trade_category import TradeCategoryRead
from ...schemas.user import UserRead
from ...schemas.worker import (
    WorkerCreate,
    WorkerCreateInternal,
    WorkerProfileUpdate,
    WorkerPublicRead,
    WorkerRead,
    WorkerUpdate,
    WorkerVerificationUpdate,
)

router = APIRouter(tags=["workers"])


@router.post("/worker", response_model=WorkerRead, status_code=201)
async def create_worker_profile(
        request: Request,
        worker: WorkerCreate,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> WorkerRead:
    """Create a worker profile for a user."""

    # Check if user exists
    db_user = await crud_users.get(
        db=db, id=worker.user_id, is_deleted=False, schema_to_select=UserRead
    )
    if db_user is None:
        raise NotFoundException("User not found")

    # Verify that the current user is creating their own worker profile or is a superuser
    if current_user["id"] != worker.user_id and not current_user.get("is_superuser", False):
        raise ForbiddenException("You can only create a worker profile for yourself")

    # Check if worker profile already exists for this user
    existing_worker = await crud_workers.exists(db=db, user_id=worker.user_id)
    if existing_worker:
        raise DuplicateValueException("Worker profile already exists for this user")

    # Create worker profile
    worker_internal = WorkerCreateInternal(**worker.model_dump())
    created_worker = await crud_workers.create(db=db, object=worker_internal)

    worker_read = await crud_workers.get(
        db=db, id=created_worker.id, schema_to_select=WorkerRead
    )
    if worker_read is None:
        raise NotFoundException("Created worker profile not found")

    return cast(WorkerRead, worker_read)


# @router.get("/workers", response_model=PaginatedListResponse[WorkerPublicRead])
# @cache(
#     key_prefix="workers_list:page_{page}:items_{items_per_page}:category_{category}:profession_{profession}:lat_{lat}:long_{long}:radius_{radius_km}:verified_{verified_only}",
#     resource_id_name="page",  # Use page as the resource identifier for list endpoints
#     expiration=300,
# )
# async def read_workers(
#         request: Request,
#         db: Annotated[AsyncSession, Depends(async_get_db)],
#         page: int = 1,
#         items_per_page: int = 10,
#         category: int | None = None,
#         profession: str | None = None,
#         lat: Annotated[float | None, Query(ge=-90, le=90)] = None,
#         long: Annotated[float | None, Query(ge=-180, le=180)] = None,
#         radius_km: Annotated[float, Query(gt=0, le=200)] = 20,
#         verified_only: bool = False,
#         min_rating: float | None = None,
# ) -> dict:
#     """Get list of workers with optional filters."""
#     if (lat is None) ^ (long is None):
#         raise BadRequestException("Both lat and long must be provided together for proximity search.")
#
#     filters: dict[str, Any] = {}
#
#     if category is not None:
#         filters["service_category_id"] = category
#
#     if profession:
#         filters["profession"] = profession
#
#     if verified_only:
#         filters["is_verified"] = True
#
#     if min_rating is not None:
#         # This requires a more complex query - you might want to use a custom method
#         pass
#
#     workers_data: dict[str, Any]
#
#     if lat is None or long is None:
#         workers_data = await crud_workers.get_multi(
#             db=db,
#             offset=compute_offset(page, items_per_page),
#             limit=items_per_page,
#             schema_to_select=WorkerPublicRead,
#             **filters,
#         )
#     else:
#         reference_point = func.ST_SetSRID(func.ST_MakePoint(long, lat), 4326)
#         distance_m = func.ST_DistanceSphere(User.location, reference_point)
#         base_conditions = [User.is_deleted.is_(False), User.location.is_not(None), distance_m <= radius_km * 1000.0]
#
#         if verified_only:
#             base_conditions.append(WorkerProfile.is_verified.is_(True))
#
#         count_query = (
#             select(func.count())
#             .select_from(WorkerPofile)
#             .join(User, User.id == WorkerProfile.user_id)
#             .where(*base_conditions)
#         )
#         total_count = (await db.execute(count_query)).scalar_one()
#
#         query = (
#             select(WorkerPofile, (distance_m / 1000.0).label("distance_km"))
#             .join(User, User.id == WorkerPofile.user_id)
#             .where(*base_conditions)
#             .order_by(distance_m.asc())
#             .offset(compute_offset(page, items_per_page))
#             .limit(items_per_page)
#         )
#         rows = (await db.execute(query)).all()
#
#         workers_data = {
#             "data": [
#                 WorkerPublicRead(
#                     id=row.Worker.id,
#                     service_category_id=row.Worker.service_category_id,
#                     profession=row.Worker.profession,
#                     hourly_rate=row.Worker.hourly_rate,
#                     skills=row.Worker.skills,
#                     portfolio_image_urls=row.Worker.portfolio_image_urls,
#                     years_of_experience=row.Worker.years_of_experience,
#                     is_verified=row.Worker.is_verified,
#                     bio=row.Worker.bio,
#                     availability_status=row.Worker.availability_status,
#                     average_rating=row.Worker.average_rating,
#                     total_rating=row.Worker.total_rating,
#                     distance_km=float(row.distance_km),
#                 ).model_dump()
#                 for row in rows
#             ],
#             "total_count": total_count,
#         }
#
#     response: dict[str, Any] = paginated_response(
#         crud_data=workers_data, page=page, items_per_page=items_per_page
#     )
#     return response


@router.get("/categories", response_model=list[TradeCategoryRead])
async def get_categories(
        request: Request,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[TradeCategoryRead]:
    result = await db.execute(select(TradeCategory).order_by(TradeCategory.name))
    categories = result.scalars().all()
    return [TradeCategoryRead(id=cat.id, name=cat.name, description=cat.description) for cat in categories]


@router.get("/worker/me", response_model=WorkerRead)
async def read_my_worker_profile(
        request: Request,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> WorkerRead:
    """Get current user's worker profile."""

    db_worker = await crud_workers.get(
        db=db, user_id=current_user["id"], schema_to_select=WorkerRead
    )
    if db_worker is None:
        raise NotFoundException("You don't have a worker profile yet")

    return cast(WorkerRead, db_worker)


@router.put("/worker/profile", response_model=WorkerRead, dependencies=[Depends(require_role(UserRole.worker.value))])
async def put_worker_profile(
        request: Request,
        payload: WorkerProfileUpdate,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> WorkerRead:
    if payload.service_category_id is not None:
        category = await db.execute(select(TradeCategory).where(TradeCategory.id == payload.service_category_id))
        if category.scalar_one_or_none() is None:
            raise NotFoundException("Service category not found")

    db_worker = await crud_workers.get(db=db, user_id=current_user["id"], return_as_model=True)
    if db_worker is None:
        if payload.hourly_rate is None:
            raise BadRequestException("hourly_rate is required when creating a worker profile.")
        profession_value = payload.profession or "General Worker"
        worker_create = WorkerCreateInternal(
            user_id=current_user["id"],
            profession=profession_value,
            hourly_rate=payload.hourly_rate,
            service_category_id=payload.service_category_id,
            skills=payload.skills or [],
            portfolio_image_urls=payload.portfolio_image_urls or [],
            years_of_experience=None,
            bio=None,
            availability_status="available",
        )
        created = await crud_workers.create(db=db, object=worker_create)
        worker_read = await crud_workers.get(db=db, id=created.id, schema_to_select=WorkerRead)
        if worker_read is None:
            raise NotFoundException("Worker profile not found after creation")
        return cast(WorkerRead, worker_read)

    update_payload = payload.model_dump(exclude_unset=True)
    if "skills" in update_payload and update_payload["skills"] is None:
        update_payload["skills"] = []
    if "portfolio_image_urls" in update_payload and update_payload["portfolio_image_urls"] is None:
        update_payload["portfolio_image_urls"] = []

    await crud_workers.update(db=db, object=update_payload, user_id=current_user["id"])
    worker_read = await crud_workers.get(db=db, user_id=current_user["id"], schema_to_select=WorkerRead)
    if worker_read is None:
        raise NotFoundException("Worker profile not found")
    return cast(WorkerRead, worker_read)


@router.get("/worker/{worker_id}", response_model=WorkerPublicRead)
@cache(key_prefix="worker_cache", resource_id_name="worker_id", expiration=300)
async def read_worker(
        request: Request,
        worker_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> WorkerPublicRead:
    """Get a specific worker profile by ID."""

    db_worker = await crud_workers.get(
        db=db, id=worker_id, schema_to_select=WorkerPublicRead
    )
    if db_worker is None:
        raise NotFoundException("Worker profile not found")

    return cast(WorkerPublicRead, db_worker)


@router.get("/worker/user/{user_id}", response_model=WorkerRead)
async def read_worker_by_user(
        request: Request,
        user_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> WorkerRead:
    """Get worker profile by user ID (authenticated users only)."""

    db_worker = await crud_workers.get(
        db=db, user_id=user_id, schema_to_select=WorkerRead
    )
    if db_worker is None:
        raise NotFoundException("Worker profile not found for this user")

    return cast(WorkerRead, db_worker)


@router.patch("/worker/{worker_id}")
@cache(key_prefix="worker_cache", resource_id_name="worker_id", pattern_to_invalidate_extra=["workers_list:*"])
async def update_worker(
        request: Request,
        worker_id: int,
        values: WorkerUpdate,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Update worker profile."""

    db_worker = await crud_workers.get(db=db, id=worker_id, schema_to_select=WorkerRead, return_as_model=True)
    if db_worker is None:
        raise NotFoundException("Worker profile not found")
    if db_worker is None:
        raise NotFoundException("Worker profile not found")

    # Check if the current user owns this worker profile
    if isinstance(db_worker, dict):
        worker_user_id = db_worker["user_id"]
    elif isinstance(db_worker, WorkerRead):
        worker_user_id = db_worker.user_id
    else:
        raise TypeError("Unexpected type for db_worker")

    if current_user["id"] != worker_user_id and not current_user.get("is_superuser", False):
        raise ForbiddenException("You can only update your own worker profile")

    await crud_workers.update(db=db, object=values, id=worker_id)
    return {"message": "Worker profile updated"}


@router.patch("/worker/{worker_id}/verify", dependencies=[Depends(get_current_superuser)])
@cache(key_prefix="worker_cache", resource_id_name="worker_id", pattern_to_invalidate_extra=["workers_list:*"])
async def verify_worker(
        request: Request,
        worker_id: int,
        verification: WorkerVerificationUpdate,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Verify or unverify a worker (admin only)."""

    db_worker = await crud_workers.get(db=db, id=worker_id)
    if db_worker is None:
        raise NotFoundException("Worker profile not found")

    await crud_workers.update(db=db, object=verification, id=worker_id)

    status = "verified" if verification.is_verified else "unverified"
    return {"message": f"Worker profile {status}"}


@router.delete("/worker/{worker_id}")
@cache(key_prefix="worker_cache", resource_id_name="worker_id", pattern_to_invalidate_extra=["workers_list:*"])
async def delete_worker(
        request: Request,
        worker_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Delete worker profile (soft delete if supported, otherwise hard delete)."""

    db_worker = await crud_workers.get(db=db, id=worker_id)
    if db_worker is None:
        raise NotFoundException("Worker profile not found")

    # Check ownership
    if isinstance(db_worker, dict):
        worker_user_id = db_worker["user_id"]

    elif isinstance(db_worker, WorkerRead):
        worker_user_id = db_worker.user_id
    else:
        raise TypeError("Unexpected type for db_worker")

    if current_user["id"] != worker_user_id and not current_user.get("is_superuser", False):
        raise ForbiddenException("You can only delete your own worker profile")

    await crud_workers.delete(db=db, id=worker_id)
    return {"message": "Worker profile deleted"}


@router.delete("/db_worker/{worker_id}", dependencies=[Depends(get_current_superuser)])
@cache(key_prefix="worker_cache", resource_id_name="worker_id", pattern_to_invalidate_extra=["workers_list:*"])
async def erase_db_worker(
        request: Request,
        worker_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Permanently delete worker profile from database (admin only)."""

    db_worker = await crud_workers.exists(db=db, id=worker_id)
    if not db_worker:
        raise NotFoundException("Worker profile not found")

    await crud_workers.db_delete(db=db, id=worker_id)
    return {"message": "Worker profile permanently deleted from database"}


@router.get("/professions", response_model=list[str])
async def get_professions(
        request: Request,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[str]:
    """Get list of all unique professions."""
    from sqlalchemy import distinct, select

    from ...models.worker import Worker

    result = await db.execute(
        select(distinct(Worker.profession))
        .order_by(Worker.profession)
    )

    professions = [row[0] for row in result.all()]
    return professions
