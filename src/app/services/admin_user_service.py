import logging

from fastcrud import PaginatedListResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.exceptions.http_exceptions import BadRequestException, ForbiddenException, NotFoundException
from ..crud.crud_admin_action_log import crud_admin_action_log
from ..crud.crud_users import crud_users
from ..schemas.admin_action_log import AdminActionLogCreateInternal, AdminActionLogRead
from ..schemas.user import UserAdminFilter, UserRead
from .minio_client import minio_client

logger = logging.getLogger(__name__)

TARGET_TYPE_USER = "user"


async def list_users(db: AsyncSession, filters: UserAdminFilter, offset: int = 0, limit: int = 20) -> PaginatedListResponse[UserRead]:
    return await crud_users.search_users(db=db, filters=filters, offset=offset, limit=limit)


async def get_user_detail(db: AsyncSession, user_id: int) -> UserRead:
    user = await crud_users.get(db=db, id=user_id, is_deleted=False, schema_to_select=UserRead, return_as_model=True)
    if user is None:
        raise NotFoundException(f"User with id {user_id} not found")
    return user


async def get_user_audit_log(db: AsyncSession, user_id: int) -> list[AdminActionLogRead]:
    result = await crud_admin_action_log.get_multi(
        db=db,
        target_type=TARGET_TYPE_USER,
        target_id=user_id,
        schema_to_select=AdminActionLogRead,
        return_as_model=True,
        limit=None,
        sort_columns="created_at",
        sort_orders="desc",
    )
    return result["data"]


async def suspend_user(db: AsyncSession, target_user_id: int, admin: dict, reason: str | None = None) -> UserRead:
    """Suspend an account -- reversible via reactivate_user. Guards against
    an admin locking themselves out and against one admin suspending
    another (neither is asked for by the issue, but both are obvious
    correctness gaps for an action that blocks login immediately)."""
    if target_user_id == admin["id"]:
        raise BadRequestException("You cannot suspend your own account")

    target = await get_user_detail(db, target_user_id)
    if target.is_superuser:
        raise ForbiddenException("Cannot suspend another admin account")
    if target.is_suspended:
        raise BadRequestException("This account is already suspended")

    await crud_users.suspend(db=db, user_id=target_user_id)
    await crud_admin_action_log.create(
        db=db,
        object=AdminActionLogCreateInternal(
            action="suspend_user", target_type=TARGET_TYPE_USER, target_id=target_user_id,
            actor_id=admin["id"], reason=reason,
        ),
    )
    return await get_user_detail(db, target_user_id)


async def reactivate_user(db: AsyncSession, target_user_id: int, admin: dict, reason: str | None = None) -> UserRead:
    target = await get_user_detail(db, target_user_id)
    if not target.is_suspended:
        raise BadRequestException("This account is not suspended")

    await crud_users.reactivate(db=db, user_id=target_user_id)
    await crud_admin_action_log.create(
        db=db,
        object=AdminActionLogCreateInternal(
            action="reactivate_user", target_type=TARGET_TYPE_USER, target_id=target_user_id,
            actor_id=admin["id"], reason=reason,
        ),
    )
    return await get_user_detail(db, target_user_id)


async def permanently_delete_user(db: AsyncSession, target_user_id: int, admin: dict, reason: str | None = None) -> None:
    """Irreversibly delete an account and everything that cascades from it
    (jobs, worker profile, reviews, billing rows, ...) -- data-deletion
    requests. Same guards as suspend_user. Unlike get_user_detail this also
    finds soft-deleted (deactivated) accounts: those are exactly the ones a
    deletion request usually targets.

    The audit row is written in the same transaction as the delete, so there
    is never a "deleted" entry for a user who still exists (or vice versa).
    It survives the user: target_id is a plain int, not an FK."""
    if target_user_id == admin["id"]:
        raise BadRequestException("You cannot delete your own account")

    target = await crud_users.get(db=db, id=target_user_id, schema_to_select=UserRead, return_as_model=True)
    if target is None:
        raise NotFoundException(f"User with id {target_user_id} not found")
    if target.is_superuser:
        raise ForbiddenException("Cannot delete another admin account")

    await crud_admin_action_log.create(
        db=db,
        object=AdminActionLogCreateInternal(
            action="hard_delete_user", target_type=TARGET_TYPE_USER, target_id=target_user_id,
            actor_id=admin["id"], reason=reason,
        ),
        commit=False,
    )
    await crud_users.db_delete(db=db, id=target_user_id)

    _delete_user_files(target_user_id)


def _delete_user_files(user_id: int) -> None:
    """Best-effort removal of the user's stored photos and ID document. The
    account is already gone at this point, so a storage error is logged
    rather than surfaced. Both the current `{kind}s/{user_id}/...` layout
    and the legacy `{kind}s/{user_id}.{ext}` keys are covered -- the prefix
    always ends in "/" or "." so user 12 never matches user 123's files."""
    targets = [
        (minio_client.bucket_uploads, f"avatars/{user_id}/"),
        (minio_client.bucket_uploads, f"avatars/{user_id}."),
        (minio_client.bucket_uploads, f"portfolio_images/{user_id}/"),
        (minio_client.bucket_uploads, f"portfolio_images/{user_id}."),
        (settings.APP_S3_BUCKET_VERIFICATION, f"cni/{user_id}."),
    ]
    for bucket, prefix in targets:
        try:
            minio_client.delete_prefix(bucket=bucket, prefix=prefix)
        except Exception:
            logger.exception("Failed to delete stored files %s/%s for deleted user %s", bucket, prefix, user_id)
