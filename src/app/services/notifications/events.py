from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ...core.logger import logging
from ...models import NotificationChannel
from .service import NotificationEvent, NotificationService

logger = logging.getLogger(__name__)


async def notify_user(
    db: AsyncSession,
    *,
    event_type: str,
    user_id: int,
    title_ar: str,
    title_fr: str,
    title_en: str,
    body_ar: str,
    body_fr: str,
    body_en: str,
    related_job_id: int | None = None,
    email_payload: dict[str, Any] | None = None,
) -> None:
    """Fire an in-app + push notification at one user, and an email too when
    `email_payload` is given -- its keys become `$variables` in the
    `{event_type}_{language}.html` template (see email_templates/), so
    `event_type` must match a template name whenever this is passed.

    Used by the job lifecycle/application/review code, which must never let
    a notification failure block or roll back the business transaction it's
    reporting on -- so this swallows and logs rather than raising."""
    channels: list[NotificationChannel] = [NotificationChannel.IN_APP, NotificationChannel.PUSH]
    recipients: dict[NotificationChannel, str] = {
        NotificationChannel.IN_APP: str(user_id),
        NotificationChannel.PUSH: str(user_id),
    }
    payload: dict[str, Any] = {
        "title_ar": title_ar,
        "title_fr": title_fr,
        "title_en": title_en,
        "body_ar": body_ar,
        "body_fr": body_fr,
        "body_en": body_en,
        "related_job_id": related_job_id,
    }
    if email_payload is not None:
        channels.append(NotificationChannel.EMAIL)
        recipients[NotificationChannel.EMAIL] = str(user_id)
        payload.update(email_payload)

    try:
        await NotificationService().send(
            db,
            NotificationEvent(
                event_type=event_type,
                channels=tuple(channels),
                recipients=recipients,
                template=event_type,
                payload=payload,
            ),
        )
    except Exception as exc:  # pragma: no cover - defensive: NotificationService already catches provider errors
        logger.warning("Failed to send notification event=%s user_id=%s: %s", event_type, user_id, exc)
