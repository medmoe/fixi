from __future__ import annotations

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
    body_ar: str,
    body_fr: str,
    related_job_id: int | None = None,
) -> None:
    """Fire an in-app + push notification at one user. Used by the job
    lifecycle/application code, which must never let a notification failure
    block or roll back the business transaction it's reporting on -- so this
    swallows and logs rather than raising."""
    try:
        await NotificationService().send(
            db,
            NotificationEvent(
                event_type=event_type,
                channels=(NotificationChannel.IN_APP, NotificationChannel.PUSH),
                recipients={
                    NotificationChannel.IN_APP: str(user_id),
                    NotificationChannel.PUSH: str(user_id),
                },
                template=event_type,
                payload={
                    "title_ar": title_ar,
                    "title_fr": title_fr,
                    "body_ar": body_ar,
                    "body_fr": body_fr,
                    "related_job_id": related_job_id,
                    # Plain title/body for channels (push) that don't do bilingual copy.
                    "title": title_fr,
                    "body": body_fr,
                },
            ),
        )
    except Exception as exc:  # pragma: no cover - defensive: NotificationService already catches provider errors
        logger.warning("Failed to send notification event=%s user_id=%s: %s", event_type, user_id, exc)
