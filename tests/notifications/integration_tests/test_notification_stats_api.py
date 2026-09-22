from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import NotificationChannel, NotificationLog, NotificationLogStatus


async def _create_log(async_session: AsyncSession, **overrides) -> NotificationLog:
    defaults = {
        "event_type": "otp_code",
        "channel": NotificationChannel.SMS,
        "provider": "capcom6",
        "status": NotificationLogStatus.SENT,
        "error": None,
    }
    defaults.update(overrides)
    log = NotificationLog(**defaults)
    async_session.add(log)
    await async_session.commit()
    await async_session.refresh(log)
    return log


class TestGetNotificationStats:
    """GET /api/v1/notifications/stats"""

    async def test_requires_authentication(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/notifications/stats")
        assert response.status_code == 401

    async def test_rejects_a_non_admin_user(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.get("/api/v1/notifications/stats", headers=customer_auth_headers)
        assert response.status_code == 403

    async def test_returns_failure_rate_by_channel_and_provider(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers
    ):
        await _create_log(async_session, status=NotificationLogStatus.SENT)
        await _create_log(async_session, status=NotificationLogStatus.FAILED)
        await _create_log(async_session, channel=NotificationChannel.EMAIL, provider="mailjet", event_type="review_received", status=NotificationLogStatus.SENT)

        response = await async_client.get("/api/v1/notifications/stats", headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        sms_row = next(row for row in body if row["channel"] == "sms")
        assert sms_row["provider"] == "capcom6"
        assert sms_row["sent"] == 1
        assert sms_row["failed"] == 1
        assert sms_row["failure_rate"] == 0.5

    async def test_skipped_does_not_count_toward_failure_rate(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers
    ):
        await _create_log(async_session, channel=NotificationChannel.PUSH, provider="fcm", status=NotificationLogStatus.SENT)
        await _create_log(async_session, channel=NotificationChannel.PUSH, provider="fcm", status=NotificationLogStatus.SKIPPED)
        await _create_log(async_session, channel=NotificationChannel.PUSH, provider="fcm", status=NotificationLogStatus.SKIPPED)

        response = await async_client.get("/api/v1/notifications/stats", headers=admin_auth_headers)

        row = next(r for r in response.json() if r["channel"] == "push")
        assert row["skipped"] == 2
        assert row["attempted"] == 1
        assert row["failure_rate"] == 0.0

    async def test_since_hours_excludes_older_rows(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers
    ):
        old = await _create_log(async_session, status=NotificationLogStatus.FAILED)
        old.created_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=48)
        await async_session.commit()
        await _create_log(async_session, status=NotificationLogStatus.SENT)

        response = await async_client.get("/api/v1/notifications/stats", headers=admin_auth_headers, params={"since_hours": 1})

        row = next(r for r in response.json() if r["channel"] == "sms")
        assert row["sent"] == 1
        assert row["failed"] == 0

    async def test_event_type_filter(self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers):
        await _create_log(async_session, event_type="otp_code", status=NotificationLogStatus.FAILED)
        await _create_log(async_session, event_type="review_received", channel=NotificationChannel.EMAIL, provider="mailjet", status=NotificationLogStatus.FAILED)

        response = await async_client.get(
            "/api/v1/notifications/stats", headers=admin_auth_headers, params={"event_type": "otp_code"}
        )

        body = response.json()
        assert len(body) == 1
        assert body[0]["channel"] == "sms"
