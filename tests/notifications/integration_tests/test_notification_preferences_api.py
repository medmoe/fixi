from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_notification_preferences import crud_notification_preferences
from src.app.models import NotificationChannel


class TestGetNotificationPreferences:
    """GET /api/v1/notifications/preferences"""

    async def test_returns_every_toggleable_combo_enabled_by_default(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.get("/api/v1/notifications/preferences", headers=customer_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body) > 0
        assert all(row["enabled"] is True for row in body)
        assert all(row["channel"] in ("push", "email") for row in body)

    async def test_a_disabled_row_shows_up_as_disabled(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user
    ):
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=customer_test_user.id, channel=NotificationChannel.PUSH, event_type="job.started", enabled=False
        )

        response = await async_client.get("/api/v1/notifications/preferences", headers=customer_auth_headers)

        body = response.json()
        row = next(r for r in body if r["event_type"] == "job.started" and r["channel"] == "push")
        assert row["enabled"] is False

    async def test_never_includes_sms_or_in_app(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.get("/api/v1/notifications/preferences", headers=customer_auth_headers)

        channels = {row["channel"] for row in response.json()}
        assert "sms" not in channels
        assert "in_app" not in channels

    async def test_requires_authentication(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/notifications/preferences")
        assert response.status_code == 401

    async def test_preferences_are_scoped_to_the_current_user(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, other_customer_test_user
    ):
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=other_customer_test_user.id, channel=NotificationChannel.PUSH, event_type="job.started", enabled=False
        )

        response = await async_client.get("/api/v1/notifications/preferences", headers=customer_auth_headers)

        row = next(r for r in response.json() if r["event_type"] == "job.started" and r["channel"] == "push")
        assert row["enabled"] is True  # the other user's override doesn't leak here


class TestUpdateNotificationPreference:
    """PUT /api/v1/notifications/preferences"""

    async def test_disables_the_given_combo(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user
    ):
        response = await async_client.put(
            "/api/v1/notifications/preferences",
            headers=customer_auth_headers,
            json={"event_type": "job.started", "channel": "push", "enabled": False},
        )

        assert response.status_code == 200
        assert response.json() == {"event_type": "job.started", "channel": "push", "enabled": False}

        row = await crud_notification_preferences.get(
            db=async_session, user_id=customer_test_user.id, channel=NotificationChannel.PUSH, event_type="job.started",
            return_as_model=False,
        )
        assert row["enabled"] is False

    async def test_re_enables_a_previously_disabled_combo(self, async_client: AsyncClient, customer_auth_headers):
        await async_client.put(
            "/api/v1/notifications/preferences",
            headers=customer_auth_headers,
            json={"event_type": "job.started", "channel": "push", "enabled": False},
        )

        response = await async_client.put(
            "/api/v1/notifications/preferences",
            headers=customer_auth_headers,
            json={"event_type": "job.started", "channel": "push", "enabled": True},
        )

        assert response.status_code == 200
        assert response.json()["enabled"] is True

    async def test_rejects_sms_even_for_an_otherwise_toggleable_event_type(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.put(
            "/api/v1/notifications/preferences",
            headers=customer_auth_headers,
            json={"event_type": "otp_code", "channel": "sms", "enabled": False},
        )

        assert response.status_code == 400

    async def test_rejects_in_app(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.put(
            "/api/v1/notifications/preferences",
            headers=customer_auth_headers,
            json={"event_type": "job.started", "channel": "in_app", "enabled": False},
        )

        assert response.status_code == 400

    async def test_rejects_an_unknown_event_type(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.put(
            "/api/v1/notifications/preferences",
            headers=customer_auth_headers,
            json={"event_type": "does.not.exist", "channel": "push", "enabled": False},
        )

        assert response.status_code == 400

    async def test_rejects_a_channel_not_offered_for_that_event_type(self, async_client: AsyncClient, customer_auth_headers):
        # job.started only ever sends PUSH -- EMAIL is a real channel but not
        # a valid toggle for this event_type.
        response = await async_client.put(
            "/api/v1/notifications/preferences",
            headers=customer_auth_headers,
            json={"event_type": "job.started", "channel": "email", "enabled": False},
        )

        assert response.status_code == 400

    async def test_requires_authentication(self, async_client: AsyncClient):
        response = await async_client.put(
            "/api/v1/notifications/preferences",
            json={"event_type": "job.started", "channel": "push", "enabled": False},
        )
        assert response.status_code == 401
