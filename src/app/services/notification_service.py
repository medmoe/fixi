from __future__ import annotations

from typing import Any

from ..core.config import settings
from ..core.logger import logging

logger = logging.getLogger(__name__)


def _send_fcm_topic_message(topic: str, title: str, body: str, data: dict[str, str] | None = None) -> bool:
    if not settings.FCM_ENABLED:
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
    except Exception as exc:  # pragma: no cover - optional dependency path
        logger.warning("FCM enabled but firebase-admin is unavailable: %s", exc)
        return False

    try:
        if not firebase_admin._apps:
            if settings.FCM_SERVICE_ACCOUNT_JSON:
                cred = credentials.Certificate(settings.FCM_SERVICE_ACCOUNT_JSON)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            topic=topic,
            data=data or {},
        )
        messaging.send(message)
        return True
    except Exception as exc:  # pragma: no cover - external integration path
        logger.warning("FCM send failed: %s", exc)
        return False


def notify_user_status_change(user_id: int, title: str, body: str, data: dict[str, Any] | None = None) -> None:
    topic = f"{settings.FCM_TOPIC_PREFIX}{user_id}"
    logger.info("Notification event -> user_id=%s title=%s body=%s data=%s", user_id, title, body, data)
    string_data = {k: str(v) for k, v in (data or {}).items()}
    _send_fcm_topic_message(topic=topic, title=title, body=body, data=string_data)
