import os
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastcrud import PaginatedListResponse
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ...api.dependencies import get_current_superuser, get_current_user, rate_limiter_dependency
from ...core.config import settings
from ...core.db.database import async_get_db
from ...core.events import publish
from ...core.exceptions.http_exceptions import HTTPException, NotFoundException
from ...crud.crud_portfolio_images import crud_portfolio_images
from ...crud.crud_reviews import crud_reviews
from ...crud.crud_worker_profiles import crud_worker_profiles
from ...crud.crud_workers_trades import crud_worker_trades
from ...models import WorkerProfile, WorkerTrade
from ...schemas.portfolio_image import PortfolioImageCreate, PortfolioImageRead
from ...schemas.review import ReviewSortBy, WorkerReviewEligibility, WorkerReviewsResponse
from ...schemas.worker_profile import AvailabilityToggleRequest, WorkerProfileFilter, WorkerProfileRead, WorkerProfileUpdate, WorkerProfileUpdateInternal, WorkerProfileWithTradesRead, WorkerTradeNestedRead
from ...schemas.worker_trade import TradeAssignRequest
from ...services.minio_client import minio_client
from ...services.review_eligibility_service import check_worker_review_eligibility
from ...services.worker_verification_service import approve_worker_verification

router = APIRouter(tags=["workers"], prefix="/worker-profile")

MAX_PORTFOLIO_IMAGES = 10


# ————— Private helpers —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

async def _get_worker_profile_or_404(db: AsyncSession, user_id: int) -> WorkerProfileRead:
    worker_profile = await crud_worker_profiles.get(
        db=db,
        user_id=user_id,
        schema_to_select=WorkerProfileRead,
        return_as_model=True
    )
    if worker_profile is None:
        raise NotFoundException("Worker profile not found")
    return worker_profile


async def _upload_image_file(
        db: AsyncSession,
        worker_profile: WorkerProfileRead,
        file: UploadFile,
        placeholder: str
) -> str:
    contents = await file.read()
    # validate MIME type
    mime_type = file.content_type or ""
    if not mime_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid file type '{mime_type}'. Only images are allowed.")

    # generate unique key
    ext = os.path.splitext(file.filename or placeholder)[1].lstrip(".")
    ext = ext if ext else "jpg"
    key = f"{placeholder}s/{worker_profile.user_id}.{ext}"

    # upload to MinIo/S3
    minio_client.upload_file(bucket=minio_client.bucket_uploads, key=key, data=contents, content_type=mime_type)

    # build CDN URL — same pattern as FileRead.file_url
    cdn_url = f"{settings.APP_S3_ENDPOINT.rstrip('/')}/{minio_client.bucket_uploads}/{key}"
    return cdn_url


# ————— GET /worker-profile ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.get("", response_model=WorkerProfileWithTradesRead)
async def get_worker_profile(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
) -> WorkerProfileWithTradesRead:
    """ Private endpoint — returns worker profile with nested trades. """
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user["id"])
    worker_trades = await crud_worker_trades.get_trade_categories_for_worker_profile(db=db, worker_profile_id=worker_profile.id)
    nested_trades = [WorkerTradeNestedRead.model_validate(wt) for wt in worker_trades]

    return WorkerProfileWithTradesRead(
        # has_cni_document is a computed field, not a constructor kwarg --
        # excluded here so it isn't passed twice. cni_document_key itself
        # is also exclude=True on the *dump* (never serialized to JSON),
        # so it's missing from this dict entirely and must be re-added
        # explicitly from the live attribute, or the rebuilt model would
        # silently derive has_cni_document as False regardless of the
        # actual upload state.
        **worker_profile.model_dump(exclude={"has_cni_document"}),
        cni_document_key=worker_profile.cni_document_key,
        trade_categories=nested_trades
    )


# ————— PATCH /worker-profile ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.patch("", response_model=WorkerProfileRead)
async def update_worker_profile(
        body: WorkerProfileUpdate,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
) -> Any:
    """ Partial update — owner or admin only. """
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user['id'])

    updated_worker_profile = await crud_worker_profiles.update(
        db=db,
        object=body,
        user_id=worker_profile.user_id,
        schema_to_select=WorkerProfileRead,
        return_as_model=True
    )
    return updated_worker_profile


# ————— PATCH /worker-profile/availability —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.patch("/availability", response_model=WorkerProfileRead, dependencies=[Depends(rate_limiter_dependency)])
async def toggle_worker_availability(
        body: AvailabilityToggleRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
) -> Any:
    """ Toggle worker availability — owner only. Max 10 toggles per minute."""
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user['id'])

    # set available_since only when toggling ON
    available_since: datetime | None = None
    if body.is_available:
        available_since = datetime.now(UTC)

    # update both fields atomically
    updated_worker_profile = await crud_worker_profiles.update(
        db=db,
        object=WorkerProfileUpdateInternal(is_available=body.is_available, available_since=available_since),
        user_id=worker_profile.user_id,
        schema_to_select=WorkerProfileRead,
        return_as_model=True
    )
    # public event — prep for WebSocket in Week 7
    await publish(
        "worker_profile:availability_changed",
        {
            "worker_profile_id": worker_profile.id,
            "is_available": body.is_available,
            "available_since": available_since.isoformat() if available_since else None,
        }
    )

    return updated_worker_profile


# ————— POST /worker-profile/avatar ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.post("/avatar", response_model=WorkerProfileRead)
async def upload_worker_avatar(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
        file: UploadFile = File(...),
) -> Any:
    """ Upload avatar image — owner or admin only"""
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user["id"])
    avatar_url = await _upload_image_file(db=db, worker_profile=worker_profile, file=file, placeholder="avatar")
    # update the profile
    updated_worker_profile = await crud_worker_profiles.update(
        db=db,
        object=WorkerProfileUpdate(avatar_url=avatar_url),
        user_id=worker_profile.user_id,
        id=worker_profile.id,
        schema_to_select=WorkerProfileRead,
        return_as_model=True
    )
    return updated_worker_profile


# ————— POST /worker-profile/cni-document ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.post("/cni-document", response_model=WorkerProfileRead)
async def upload_cni_document(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
        file: UploadFile = File(...),
) -> Any:
    """Upload the worker's CNI (Carte Nationale d'Identité) for admin
    verification -- owner only. Stored in a private bucket, never a public
    URL, unlike avatar_url/portfolio images (see MinioClient's
    ensure_private_bucket_exists and Issue 5's acceptance criteria)."""
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user["id"])

    contents = await file.read()
    mime_type = file.content_type or ""
    if mime_type not in {"image/jpeg", "image/png", "application/pdf"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid file type '{mime_type}'. Only JPEG, PNG, or PDF are allowed.")

    ext = os.path.splitext(file.filename or "cni")[1].lstrip(".") or "jpg"
    key = f"cni/{worker_profile.user_id}.{ext}"

    minio_client.ensure_private_bucket_exists(settings.APP_S3_BUCKET_VERIFICATION)
    minio_client.upload_file(bucket=settings.APP_S3_BUCKET_VERIFICATION, key=key, data=contents, content_type=mime_type)

    updated_worker_profile = await crud_worker_profiles.update(
        db=db,
        object=WorkerProfileUpdateInternal(cni_document_key=key),
        user_id=worker_profile.user_id,
        schema_to_select=WorkerProfileRead,
        return_as_model=True,
    )
    return updated_worker_profile


# ————— POST /worker-profile/trade-categories/assign ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.post("/trade-categories/assign", response_model=list[WorkerTradeNestedRead])
async def assign_trades(
        body: TradeAssignRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],  # ✅ auth required
) -> list[WorkerTradeNestedRead]:
    """
    Assign a list of trades to a worker profile.
    - Nonexistent trade IDs are ignored
    - Already assigned trades are ignored
    - Rejects with 400 if total would exceed 5
    - Returns updated profile with all trades
    """
    worker_trade_categories = await crud_worker_trades.assign_trades_bulk(
        db=db,
        user_id=current_user["id"],
        trade_category_ids=body.trade_category_ids,
    )

    return [WorkerTradeNestedRead.model_validate(wt) for wt in worker_trade_categories]


# ————— DELETE /worker-profile/trade-categories/{trade_category_id} ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.delete("/trade-categories/{trade_category_id}", response_model=list[WorkerTradeNestedRead])
async def remove_trade_from_worker(
        trade_category_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)]
) -> list[WorkerTradeNestedRead]:
    """ Remove a trade from a worker profile — owner only."""
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user['id'])

    updated_worker_trade_categories = await crud_worker_trades.dismiss_trade_category(db=db, worker_profile_id=worker_profile.id, trade_category_id=trade_category_id)
    return [WorkerTradeNestedRead.model_validate(wt) for wt in updated_worker_trade_categories]


# ————— POST /worker-profile/portfolio-images ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.post("/portfolio-images", response_model=PortfolioImageRead, status_code=201)
async def upload_portfolio_image(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
        file: UploadFile = File(...),
) -> PortfolioImageRead:
    """ Upload portfolio image — owner or admin only """
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user['id'])

    # check limit
    existing_count = await crud_portfolio_images.count(db=db, worker_profile_id=worker_profile.id)
    if existing_count >= MAX_PORTFOLIO_IMAGES:
        raise HTTPException(status_code=400, detail="Maximum number of portfolio images reached")

    cdn_url = await _upload_image_file(db=db, worker_profile=worker_profile, file=file, placeholder="portfolio_image")
    object_in = PortfolioImageCreate.model_validate({"worker_profile_id": worker_profile.id, "image_url": cdn_url})
    return await crud_portfolio_images.create(db=db, object=object_in, schema_to_select=PortfolioImageRead, return_as_model=True)


# ————— GET /worker-profile/{worker_profile_id}/portfolio-img/{portfolio_image_id} ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.get("/{worker_profile_id}/portfolio-images/{portfolio_image_id}", response_model=PortfolioImageRead, status_code=200)
async def get_portfolio_image(
        worker_profile_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        portfolio_image_id: int
) -> PortfolioImageRead:
    worker_profile_exists = await crud_worker_profiles.exists(db=db, id=worker_profile_id)
    if not worker_profile_exists:
        raise NotFoundException("Worker profile not found")

    portfolio_image = await crud_portfolio_images.get(
        db=db,
        worker_profile_id=worker_profile_id,
        id=portfolio_image_id,
        schema_to_select=PortfolioImageRead,
        return_as_model=True
    )
    if not portfolio_image:
        raise NotFoundException("Portfolio image not found")

    return portfolio_image


# ————— GET /worker-profile/{worker_profile_id}/portfolio-images ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.get("/{worker_profile_id}/portfolio-images", response_model=list[PortfolioImageRead], status_code=200)
async def get_portfolio_images(
        worker_profile_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[PortfolioImageRead]:
    worker_profile_exist = await crud_worker_profiles.exists(db=db, id=worker_profile_id)
    if not worker_profile_exist:
        raise NotFoundException("Worker profile not found")

    result = await crud_portfolio_images.get_multi(
        db=db,
        worker_profile_id=worker_profile_id,
        schema_to_select=PortfolioImageRead,
        return_as_model=True
    )
    return result["data"]


# ————— DELETE /worker-profile/{worker_profile_id}/portfolio-images/{portfolio_image_id} ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.delete("/portfolio-images/{portfolio_image_id}", status_code=204)
async def delete_portfolio_image(
        portfolio_image_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
) -> None:
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user["id"])
    try:
        await crud_portfolio_images.delete(db=db, id=portfolio_image_id, worker_profile_id=worker_profile.id)
    except NoResultFound:
        raise NotFoundException("Portfolio image not found")


# ————— GET /worker-profile/search ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
@router.get("/search", response_model=PaginatedListResponse[WorkerProfileWithTradesRead])
async def search_workers(
        # NOTE: intentionally public — no auth dependency.
        db: Annotated[AsyncSession, Depends(async_get_db)],
        filters: Annotated[WorkerProfileFilter, Depends()],
        offset: int = Query(0, ge=0, description="Pagination offset"),
        limit: int = Query(20, ge=1, le=100, description="Pagination limit"),
) -> PaginatedListResponse[WorkerProfileWithTradesRead]:
    """
    Public search endpoint for finding workers by multiple criteria.
    All filters are optional. When latitude and longitude are both provided,
    additionally filters to workers whose service radius covers that location.

    Results are ranked by availability first, then verification status, then
    by sort_by (distance | hourly_rate | experience — default: distance).
    """
    return await crud_worker_profiles.search_workers(db=db, filters=filters, offset=offset, limit=limit)


# ————— GET /worker-profile/{worker_profile_id}/reviews ——————————————————
@router.get("/{worker_profile_id}/reviews", response_model=WorkerReviewsResponse, status_code=200)
async def get_worker_reviews(
        # NOTE: intentionally public — no auth dependency.
        db: Annotated[AsyncSession, Depends(async_get_db)],
        worker_profile_id: int,
        cursor: str | None = Query(None, description="Opaque cursor from a previous page's next_cursor"),
        limit: int = Query(10, ge=1, le=50, description="Page size"),
        sort: ReviewSortBy = Query(ReviewSortBy.recent, description="recent (default) or highest_rated"),
) -> WorkerReviewsResponse:
    """Public review list for a worker's profile page. Flagged reviews are excluded."""
    worker_profile = await db.scalar(select(WorkerProfile).where(WorkerProfile.id == worker_profile_id))
    if worker_profile is None:
        raise NotFoundException(f"Worker with id {worker_profile_id} not found.")

    return await crud_reviews.get_public_reviews_for_worker(
        db=db,
        worker_profile=worker_profile,
        limit=limit,
        cursor=cursor,
        sort_by=sort,
    )


# ————— GET /worker-profile/{worker_profile_id}/review-eligibility ———————
@router.get("/{worker_profile_id}/review-eligibility", response_model=WorkerReviewEligibility, status_code=200)
async def get_worker_review_eligibility(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        worker_profile_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
) -> WorkerReviewEligibility:
    """
    Powers the 'Leave a review' CTA on the worker's public profile page —
    auth required (unlike the reviews list itself), so the frontend should
    only call this once a user is logged in, never gating the rest of the
    section's initial render on it.
    """
    worker_profile_exists = await crud_worker_profiles.exists(db=db, id=worker_profile_id)
    if not worker_profile_exists:
        raise NotFoundException(f"Worker with id {worker_profile_id} not found.")

    return await check_worker_review_eligibility(db=db, worker_profile_id=worker_profile_id, user_id=current_user["id"])


# ————— PATCH /worker-profile/{worker_profile_id}/verify —————————————————
@router.patch("/{worker_profile_id}/verify", response_model=WorkerProfileRead, status_code=200)
async def verify_worker_profile(
        worker_profile_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        _admin: Annotated[dict, Depends(get_current_superuser)],
) -> Any:
    """Admin-only. Marks a worker profile as verified -- there's no automatic
    path to this today (ID/credential review happens out of band by staff),
    so this is a deliberate manual action, not a side effect of anything else.
    Superseded by the CNI verification queue's approve action (Phase 8
    Issue 5) for the normal flow, but kept as a direct escape hatch --
    both go through the same worker_verification_service function."""
    return await approve_worker_verification(db, worker_profile_id)


# ————— GET /worker-profile/{worker_profile_id} —————————————————————————
@router.get("/{worker_profile_id}", response_model=WorkerProfileWithTradesRead, status_code=200)
async def get_worker_profile_public(db: Annotated[AsyncSession, Depends(async_get_db)], worker_profile_id: int):
    """Public endpoint for getting a worker profile."""
    stmt = (
        select(WorkerProfile)
        .options(
            joinedload(WorkerProfile.user),
            selectinload(WorkerProfile.worker_trades).joinedload(WorkerTrade.trade_category),
        )
        .where(WorkerProfile.id == worker_profile_id)
    )
    result = await db.execute(stmt)
    worker_profile = result.unique().scalar_one_or_none()

    if worker_profile is None:
        raise NotFoundException(f"Worker with id {worker_profile_id} not found.")

    return WorkerProfileWithTradesRead.model_validate(worker_profile)
