import os
from datetime import UTC, datetime
from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user, rate_limiter_dependency, require_role
from ...core.config import settings
from ...core.db.database import async_get_db
from ...core.events import publish
from ...core.exceptions.http_exceptions import ForbiddenException, HTTPException, NotFoundException
from ...crud.crud_worker_profile import crud_worker_profiles
from ...crud.crud_worker_trade import crud_worker_trades
from ...models import User, WorkerProfile
from ...schemas.user import UserRead
from ...schemas.worker_profile import AvailabilityToggleRequest, AvailabilityToggleResponse, WorkerProfileCreate, WorkerProfileCreateRequest, WorkerProfileNestedRead, WorkerProfileUpdate, WorkerProfileUpdateInternal, WorkerProfileWithTradesRead, WorkerTradeNestedRead
from ...schemas.worker_trade import WorkerTradeAssignmentRequest
from ...services.minio_client import minio_client

router = APIRouter(tags=["workers"], prefix="/worker-profiles")


# ————— Private helpers —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

async def _get_worker_profile_or_404(db: AsyncSession, worker_profile_id: int) -> WorkerProfileNestedRead:
    worker_profile = await crud_worker_profiles.get_joined(db=db, id=worker_profile_id, join_model=User, join_on=WorkerProfile.user_id == User.id, nest_joins=True, schema_to_select=WorkerProfileNestedRead, join_schema_to_select=UserRead, return_as_model=True)  # type: ignore[call-overload]
    if worker_profile is None:
        raise NotFoundException("Worker profile not found")
    return cast(WorkerProfileNestedRead, worker_profile)


def _assert_owner_or_admin(db: AsyncSession, worker_profile_user_id: int, current_user: dict[str, Any]) -> None:
    is_owner = current_user["id"] == worker_profile_user_id
    is_admin = current_user.get("is_superuser", False)
    if not (is_owner or is_admin):
        raise ForbiddenException("You are not authorized to access this resource")


# ————— Post Worker Profiles ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.post("", response_model=WorkerProfileNestedRead, status_code=201)
async def create_worker_profile(body: WorkerProfileCreateRequest, db: Annotated[AsyncSession, Depends(async_get_db)], current_user: Annotated[dict, Depends(require_role("worker"))]) -> Any:
    """ Create a worker profile. Requires worker role JWT."""
    data = {**body.model_dump(mode="json"), "user_id": current_user["id"]}
    object_in = WorkerProfileCreate.model_validate(data)
    profile = await crud_worker_profiles.create(db=db, object=object_in, schema_to_select=WorkerProfileNestedRead, return_as_model=True)
    return profile


# ————— GET /worker-profiles/{worker_profile_id} ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.get("/{worker_profile_id}", response_model=WorkerProfileWithTradesRead)
async def get_worker_profile(worker_profile_id: int, db: Annotated[AsyncSession, Depends(async_get_db)]) -> WorkerProfileWithTradesRead:
    """ Public endpoint — returns worker profile with nested trades. """
    worker_profile = await _get_worker_profile_or_404(db=db, worker_profile_id=worker_profile_id)
    worker_trades = await crud_worker_trades.get_trades_for_worker_profile(db=db, worker_profile_id=worker_profile_id)
    nested_trades = [WorkerTradeNestedRead.model_validate(wt) for wt in worker_trades]

    return WorkerProfileWithTradesRead(
        **worker_profile.model_dump(),
        trades=nested_trades
    )


# ————— PATCH /worker-profiles/{worker_profile_id} ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.patch("/{worker_profile_id}", response_model=WorkerProfileNestedRead)
async def update_worker_profile(
        worker_profile_id: int,
        body: WorkerProfileUpdate,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
) -> WorkerProfileNestedRead:
    """ Partial update — owner or admin only. """
    worker_profile = await _get_worker_profile_or_404(db=db, worker_profile_id=worker_profile_id)
    _assert_owner_or_admin(db=db, worker_profile_user_id=worker_profile.user.id, current_user=current_user)

    await crud_worker_profiles.update(db=db, object=body, user_id=worker_profile.user.id)
    # re-fetch and return updated profile
    return await _get_worker_profile_or_404(db=db, worker_profile_id=worker_profile_id)


# ————— PATCH /worker-profiles/{worker_profile_id}/availability —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.patch("/{worker_profile_id}/availability", response_model=AvailabilityToggleResponse, dependencies=[Depends(rate_limiter_dependency)])
async def toggle_worker_availability(
        worker_profile_id: int,
        body: AvailabilityToggleRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
) -> AvailabilityToggleResponse:
    """ Toggle worker availability — owner only. Max 10 toggles per minute."""
    worker_profile = await _get_worker_profile_or_404(db=db, worker_profile_id=worker_profile_id)
    _assert_owner_or_admin(db=db, worker_profile_user_id=worker_profile.user.id, current_user=current_user)

    # set available_since only when toggling ON
    available_since: datetime | None = None
    if body.is_available:
        available_since = datetime.now(UTC)

    # update both fields atomically
    await crud_worker_profiles.update(
        db=db,
        object=WorkerProfileUpdateInternal(is_available=body.is_available, available_since=available_since),
        id=worker_profile_id,
    )
    # public event — prep for WebSocket in Week 7
    await publish(
        "worker_profile:availability_changed",
        {
            "worker_profile_id": worker_profile_id,
            "is_available": body.is_available,
            "available_since": available_since.isoformat() if available_since else None,
        }
    )

    return AvailabilityToggleResponse(
        is_available=body.is_available,
        available_since=available_since
    )


# ————— POST /worker-profiles/{worker_profile_id}/avatar ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.post("/{worker_profile_id}/avatar", response_model=dict)
async def upload_worker_avatar(
        worker_profile_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)],
        file: UploadFile = File(...),
) -> dict[str, str]:
    """ Upload avatar image — owner or admin only"""
    worker_profile = await _get_worker_profile_or_404(db=db, worker_profile_id=worker_profile_id)
    _assert_owner_or_admin(db=db, worker_profile_user_id=worker_profile.user.id, current_user=current_user)

    contents = await file.read()
    # validate MIME type
    mime_type = file.content_type or ""
    if not mime_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid file type '{mime_type}'. Only images are allowed.")

    # generate unique key
    ext = os.path.splitext(file.filename or "avatar")[1].lstrip(".")
    ext = ext if ext else "jpg"
    key = f"avatars/{worker_profile.user.uuid}.{ext}"

    # upload to MinIo/S3
    minio_client.upload_file(bucket=minio_client.bucket_uploads, key=key, data=contents, content_type=mime_type)

    # build CDN URL — same pattern as FileRead.file_url
    avatar_url = f"{settings.APP_S3_ENDPOINT.rstrip('/')}/{minio_client.bucket_uploads}/{key}"

    # update the profile
    await crud_worker_profiles.update(db=db, object=WorkerProfileUpdate(avatar_url=avatar_url), user_id=worker_profile.user.id, id=worker_profile.id)
    return {"avatar_url": avatar_url}


# ————— POST /worker-profiles/{worker_profile_id}/trades ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.post("/{worker_profile_id}/trades", response_model=list[WorkerTradeNestedRead])
async def assign_trade_to_worker(
        worker_profile_id: int,
        body: WorkerTradeAssignmentRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)]
) -> list[WorkerTradeNestedRead]:
    """ Assign a trade to a worker profile — owner only."""
    worker_profile = await _get_worker_profile_or_404(db=db, worker_profile_id=worker_profile_id)
    _assert_owner_or_admin(db=db, worker_profile_user_id=worker_profile.user.id, current_user=current_user)

    updated_trades = await crud_worker_trades.assign_trade(db=db, worker_profile_id=worker_profile_id, trade_category_id=body.trade_category_id, skill_level=body.skill_level)
    return [WorkerTradeNestedRead.model_validate(wt) for wt in updated_trades]


# ————— DELETE /worker-profiles/{worker_profile_id}/trades/{trade_id} ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@router.delete("/{worker_profile_id}/trades/{trade_id}", response_model=list[WorkerTradeNestedRead])
async def remove_trade_from_worker(
        worker_profile_id: int,
        trade_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)]
) -> list[WorkerTradeNestedRead]:
    """ Remove a trade from a worker profile — owner only."""
    worker_profile = await _get_worker_profile_or_404(db=db, worker_profile_id=worker_profile_id)
    _assert_owner_or_admin(db=db, worker_profile_user_id=worker_profile.user.id, current_user=current_user)

    updated_trades = await crud_worker_trades.remove_trade(db=db, worker_profile_id=worker_profile_id, trade_category_id=trade_id)
    return [WorkerTradeNestedRead.model_validate(wt) for wt in updated_trades]
