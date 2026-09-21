from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastcrud import PaginatedListResponse, paginated_response
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import NotFoundException
from ...crud.crud_notifications import crud_notifications
from ...models import Notification
from ...schemas.notification import NotificationRead
from ...services.notifications import connection_manager
from ..dependencies import get_current_user, get_current_user_ws

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ─── helpers ─────────────────────────────────────────────────────────────
async def _get_own_notification_or_404(db: AsyncSession, notification_id: int, user_id: int) -> Notification:
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != user_id:
        raise NotFoundException(f"Notification with id {notification_id} not found")
    return notification


# ─── GET /notifications ──────────────────────────────────────────────────
@router.get("", response_model=PaginatedListResponse[NotificationRead], status_code=200)
async def get_notifications(
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
        page: int = 1,
        items_per_page: int = 20,
        unread_only: bool = False,
):
    filters: dict = {"user_id": current_user["id"]}
    if unread_only:
        # FastCRUD's `=` filter renders as SQL `= NULL`, which never matches --
        # `__is` is required for a NULL comparison.
        filters["read_at__is"] = None

    notifications = await crud_notifications.get_multi(
        db=db,
        **filters,
        offset=(page - 1) * items_per_page,
        limit=items_per_page,
        sort_columns="created_at",
        sort_orders="desc",
        schema_to_select=NotificationRead,
        return_as_model=False,
    )
    return paginated_response(notifications, page, items_per_page)


# ─── PATCH /notifications/{id}/read ──────────────────────────────────────
@router.patch("/{notification_id}/read", response_model=NotificationRead, status_code=200)
async def mark_notification_read(
        notification_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
):
    notification = await _get_own_notification_or_404(db=db, notification_id=notification_id, user_id=current_user["id"])
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC).replace(tzinfo=None)
        await db.commit()
        await db.refresh(notification)
    return notification


# ─── PATCH /notifications/read-all ───────────────────────────────────────
@router.patch("/read-all", status_code=204)
async def mark_all_notifications_read(
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user["id"], Notification.read_at.is_(None))
        .values(read_at=datetime.now(UTC).replace(tzinfo=None))
    )
    await db.commit()


# ─── WS /notifications/ws ─────────────────────────────────────────────────
@router.websocket("/ws")
async def notifications_ws(
        websocket: WebSocket,
        db: Annotated[AsyncSession, Depends(async_get_db)],
):
    user = await get_current_user_ws(websocket, db)
    if user is None:
        await websocket.close(code=4401)
        return

    user_id = user["id"]
    await connection_manager.connect(user_id, websocket)
    try:
        while True:
            # Clients don't need to send anything -- this just detects disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect(user_id, websocket)
