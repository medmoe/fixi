from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastcrud import PaginatedListResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...schemas.admin_action_log import AdminActionLogRead
from ...schemas.user import UserAdminFilter, UserRead, UserSuspendRequest
from ...services.admin_user_service import get_user_audit_log, get_user_detail, list_users, permanently_delete_user, reactivate_user, suspend_user

router = APIRouter(tags=["admin"], prefix="/admin/users", dependencies=[Depends(get_current_superuser)])


# ─── GET /admin/users ─────────────────────────────────────────────────────────
@router.get("", response_model=PaginatedListResponse[UserRead], status_code=200)
async def list_users_endpoint(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        filters: Annotated[UserAdminFilter, Depends()],
        offset: int = Query(0, ge=0, description="Pagination offset"),
        limit: int = Query(20, ge=1, le=100, description="Pagination limit"),
) -> PaginatedListResponse[UserRead]:
    """List/search/filter customers and workers. search matches name,
    username, or email (case-insensitive, partial)."""
    return await list_users(db=db, filters=filters, offset=offset, limit=limit)


# ─── GET /admin/users/{user_id} ───────────────────────────────────────────────
@router.get("/{user_id}", response_model=UserRead, status_code=200)
async def get_user_detail_endpoint(
        user_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> UserRead:
    return await get_user_detail(db, user_id)


# ─── GET /admin/users/{user_id}/audit-log ─────────────────────────────────────
@router.get("/{user_id}/audit-log", response_model=list[AdminActionLogRead], status_code=200)
async def get_user_audit_log_endpoint(
        user_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[AdminActionLogRead]:
    """Every suspend/reactivate (and future admin actions) recorded against
    this user, most recent first."""
    return await get_user_audit_log(db, user_id)


# ─── POST /admin/users/{user_id}/suspend ──────────────────────────────────────
@router.post("/{user_id}/suspend", response_model=UserRead, status_code=200)
async def suspend_user_endpoint(
        user_id: int,
        payload: UserSuspendRequest,
        admin: Annotated[dict, Depends(get_current_superuser)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> UserRead:
    return await suspend_user(db, user_id, admin, reason=payload.reason)


# ─── POST /admin/users/{user_id}/reactivate ───────────────────────────────────
@router.post("/{user_id}/reactivate", response_model=UserRead, status_code=200)
async def reactivate_user_endpoint(
        user_id: int,
        payload: UserSuspendRequest,
        admin: Annotated[dict, Depends(get_current_superuser)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> UserRead:
    return await reactivate_user(db, user_id, admin, reason=payload.reason)


# ─── POST /admin/users/{user_id}/delete-permanently ───────────────────────────
@router.post("/{user_id}/delete-permanently", status_code=204)
async def permanently_delete_user_endpoint(
        user_id: int,
        payload: UserSuspendRequest,
        admin: Annotated[dict, Depends(get_current_superuser)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """Irreversible -- for data-deletion requests. Audited; can't target
    yourself or another admin."""
    await permanently_delete_user(db, user_id, admin, reason=payload.reason)
