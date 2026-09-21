from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from fastcrud import PaginatedListResponse, paginated_response
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import BadRequestException, ForbiddenException, NotFoundException
from ...crud.crud_device_tokens import crud_device_tokens
from ...crud.crud_notification_preferences import crud_notification_preferences
from ...crud.crud_notifications import crud_notifications
from ...models import Notification, User
from ...schemas.device_token import DeviceTokenCreate, DeviceTokenCreateInternal, DeviceTokenRead
from ...schemas.notification import NotificationRead
from ...schemas.notification_preference import NotificationPreferenceRead, NotificationPreferenceUpdate
from ...services.notifications import connection_manager
from ...services.notifications.event_catalog import TOGGLEABLE_EVENT_CHANNELS
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


# ─── GET /notifications/preferences ──────────────────────────────────────
@router.get("/preferences", response_model=list[NotificationPreferenceRead], status_code=200)
async def get_notification_preferences(
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[NotificationPreferenceRead]:
    """Every (event_type, channel) combo the settings UI can toggle (Issue
    6), merged with this user's overrides -- absent a row, a combo is
    enabled by default. SMS OTP never appears here: TOGGLEABLE_EVENT_CHANNELS
    only lists PUSH/EMAIL, since OTP is a mandatory auth requirement, not a
    preference (see services/otp.py, which bypasses this system entirely)."""
    rows = await crud_notification_preferences.get_multi(
        db=db,
        user_id=current_user["id"],
        limit=None,
        schema_to_select=NotificationPreferenceRead,
        return_as_model=True,
    )
    overrides = {(row.event_type, row.channel): row.enabled for row in rows["data"]}

    return [
        NotificationPreferenceRead(event_type=event_type, channel=channel, enabled=overrides.get((event_type, channel), True))
        for event_type, channels in TOGGLEABLE_EVENT_CHANNELS.items()
        for channel in sorted(channels, key=lambda c: c.value)
    ]


# ─── PUT /notifications/preferences ──────────────────────────────────────
@router.put("/preferences", response_model=NotificationPreferenceRead, status_code=200)
async def update_notification_preference(
        payload: NotificationPreferenceUpdate,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> NotificationPreferenceRead:
    allowed_channels = TOGGLEABLE_EVENT_CHANNELS.get(payload.event_type)
    if allowed_channels is None or payload.channel not in allowed_channels:
        # Also where SMS/IN_APP get rejected outright, not just hidden from
        # the UI -- SMS OTP is a mandatory auth requirement (Issue 5), never
        # toggleable, and IN_APP always records everything.
        raise BadRequestException(f"{payload.channel.value!r} is not a toggleable channel for event type {payload.event_type!r}")

    await crud_notification_preferences.set_enabled(
        db=db,
        user_id=current_user["id"],
        channel=payload.channel,
        event_type=payload.event_type,
        enabled=payload.enabled,
    )
    return NotificationPreferenceRead(event_type=payload.event_type, channel=payload.channel, enabled=payload.enabled)


# ─── POST /notifications/device-tokens ───────────────────────────────────
@router.post("/device-tokens", response_model=DeviceTokenRead, status_code=201)
async def register_device_token(
        body: DeviceTokenCreate,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
):
    return await crud_device_tokens.register(
        db=db,
        object=DeviceTokenCreateInternal(
            token=body.token,
            platform=body.platform,
            user_id=current_user["id"],
            last_seen=datetime.now(UTC).replace(tzinfo=None),
        ),
    )


# ─── DELETE /notifications/device-tokens/{token} ─────────────────────────
@router.delete("/device-tokens/{token}", status_code=204)
async def unregister_device_token(
        token: str,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
):
    existing = await crud_device_tokens.get(db=db, token=token, schema_to_select=DeviceTokenRead, return_as_model=True)
    if existing is None or existing.user_id != current_user["id"]:
        raise NotFoundException("Device token not found")
    await crud_device_tokens.delete(db=db, token=token)


# ─── POST /notifications/email/webhook ───────────────────────────────────
_BOUNCE_LIKE_EVENTS = {"bounce", "blocked", "spam"}


@router.post("/email/webhook", status_code=200)
async def mailjet_email_webhook(
        request: Request,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        secret: str | None = None,
) -> dict[str, int]:
    """Mailjet posts bounce/blocked/spam-complaint events here (configured
    in the Mailjet console under Account > Webhooks). Mailjet doesn't sign
    its payloads, so a shared secret on the URL query string is the only
    way to confirm a request actually came from Mailjet -- reject
    everything if it isn't configured, rather than run an open webhook."""
    if not settings.MAILJET_WEBHOOK_SECRET or secret != settings.MAILJET_WEBHOOK_SECRET:
        raise ForbiddenException("Invalid or missing webhook secret")

    body: Any = await request.json()
    events = body if isinstance(body, list) else [body]

    bad_emails = {
        event["email"] for event in events if isinstance(event, dict) and event.get("event") in _BOUNCE_LIKE_EVENTS and event.get("email")
    }
    if bad_emails:
        await db.execute(update(User).where(User.email.in_(bad_emails)).values(email_invalid=True))
        await db.commit()

    return {"received": len(events)}


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
