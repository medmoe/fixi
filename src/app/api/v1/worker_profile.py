import os
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user, rate_limiter_dependency
from ...core.config import settings
from ...core.db.database import async_get_db
from ...core.events import publish
from ...core.exceptions.http_exceptions import HTTPException, NotFoundException
from ...crud.crud_portfolio_images import crud_portfolio_images
from ...crud.crud_worker_profiles import crud_worker_profiles
from ...crud.crud_workers_trades import crud_worker_trades
from ...schemas.portfolio_image import PortfolioImageCreate, PortfolioImageRead
from ...schemas.worker_profile import AvailabilityToggleRequest, AvailabilityToggleResponse, WorkerProfileRead, WorkerProfileUpdate, WorkerProfileUpdateInternal, WorkerProfileWithTradesRead, WorkerTradeNestedRead
from ...schemas.worker_trade import TradeAssignRequest, WorkerTradeAssignmentRequest
from ...services.minio_client import minio_client

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
    """ Public endpoint — returns worker profile with nested trades. """
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user["id"])
    worker_trades = await crud_worker_trades.get_trade_categories_for_worker_profile(db=db, worker_profile_id=worker_profile.id)
    nested_trades = [WorkerTradeNestedRead.model_validate(wt) for wt in worker_trades]

    return WorkerProfileWithTradesRead(
        **worker_profile.model_dump(),
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

@router.patch("/availability", response_model=AvailabilityToggleResponse, dependencies=[Depends(rate_limiter_dependency)])
async def toggle_worker_availability(
        body: AvailabilityToggleRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
) -> AvailabilityToggleResponse:
    """ Toggle worker availability — owner only. Max 10 toggles per minute."""
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user['id'])

    # set available_since only when toggling ON
    available_since: datetime | None = None
    if body.is_available:
        available_since = datetime.now(UTC)

    # update both fields atomically
    await crud_worker_profiles.update(
        db=db,
        object=WorkerProfileUpdateInternal(is_available=body.is_available, available_since=available_since),
        user_id=worker_profile.user_id,
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

    return AvailabilityToggleResponse(
        is_available=body.is_available,
        available_since=available_since
    )


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


# ————— POST /worker-profile/trades ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.post("/trades", response_model=list[WorkerTradeNestedRead])
async def assign_trade_to_worker(
        body: WorkerTradeAssignmentRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)]
) -> list[WorkerTradeNestedRead]:
    """ Assign a trade to a worker profile — owner only."""
    worker_profile = await _get_worker_profile_or_404(db=db, user_id=current_user["id"])

    updated_trades = await crud_worker_trades.assign_trade(
        db=db,
        worker_profile_id=worker_profile.id,
        trade_category_id=body.trade_category_id,
        skill_level=body.skill_level
    )
    return [WorkerTradeNestedRead.model_validate(wt) for wt in updated_trades]


# ————— POST /worker-profile/trade-categories/assign ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.post("/trade-categories/assign", response_model=WorkerProfileWithTradesRead)
async def assign_trades(
        body: TradeAssignRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],  # ✅ auth required
) -> WorkerProfileWithTradesRead:
    """
    Assign a list of trades to a worker profile.
    - Nonexistent trade IDs are ignored
    - Already assigned trades are ignored
    - Rejects with 400 if total would exceed 5
    - Returns updated profile with all trades
    """
    updated_trades, worker_profile = await crud_worker_trades.assign_trades_bulk(
        db=db,
        user_id=current_user["id"],
        trade_category_ids=body.trade_category_ids,
    )

    nested_trade_categories = [WorkerTradeNestedRead.model_validate(wt) for wt in updated_trades]
    worker_profile_read = WorkerProfileRead.model_validate(worker_profile)

    return WorkerProfileWithTradesRead(
        **worker_profile_read.model_dump(),
        trade_categories=nested_trade_categories,
    )


# ————— DELETE /worker-profile/trade-categories/{trade_category_id} ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.delete("/trades/{trade_id}", response_model=list[WorkerTradeNestedRead])
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
