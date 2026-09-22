from datetime import UTC, datetime

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import Notification, User


async def create_test_notification(async_session: AsyncSession, user: User, **overrides) -> Notification:
    defaults = {
        "user_id": user.id,
        "type": "job.status_changed",
        "title_ar": "عنوان",
        "title_fr": "Titre",
        "title_en": "Title",
        "body_ar": "نص",
        "body_fr": "Corps",
        "body_en": "Body",
        "read_at": None,
        "related_job_id": None,
    }
    defaults.update(overrides)
    notification = Notification(**defaults)
    async_session.add(notification)
    await async_session.commit()
    await async_session.refresh(notification)
    return notification


class TestGetNotifications:
    """GET /api/v1/notifications"""

    async def test_returns_only_the_current_users_notifications(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user, other_customer_test_user
    ):
        await create_test_notification(async_session, customer_test_user, title_fr="Mine")
        await create_test_notification(async_session, other_customer_test_user, title_fr="Not mine")

        response = await async_client.get("/api/v1/notifications", headers=customer_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert body["total_count"] == 1
        assert [n["title_fr"] for n in body["data"]] == ["Mine"]

    async def test_orders_newest_first(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user
    ):
        older = await create_test_notification(async_session, customer_test_user, title_fr="Older")
        older.created_at = datetime(2020, 1, 1, tzinfo=UTC).replace(tzinfo=None)
        await async_session.commit()
        await create_test_notification(async_session, customer_test_user, title_fr="Newer")

        response = await async_client.get("/api/v1/notifications", headers=customer_auth_headers)

        assert [n["title_fr"] for n in response.json()["data"]] == ["Newer", "Older"]

    async def test_unread_only_filter_excludes_read_notifications(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user
    ):
        await create_test_notification(async_session, customer_test_user, title_fr="Unread")
        await create_test_notification(
            async_session, customer_test_user, title_fr="Read", read_at=datetime.now(UTC).replace(tzinfo=None)
        )

        response = await async_client.get("/api/v1/notifications?unread_only=true", headers=customer_auth_headers)

        body = response.json()
        assert body["total_count"] == 1
        assert body["data"][0]["title_fr"] == "Unread"

    async def test_pagination_respects_items_per_page(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user
    ):
        for i in range(3):
            await create_test_notification(async_session, customer_test_user, title_fr=f"N{i}")

        response = await async_client.get("/api/v1/notifications?page=1&items_per_page=2", headers=customer_auth_headers)

        body = response.json()
        assert len(body["data"]) == 2
        assert body["total_count"] == 3
        assert body["has_more"] is True

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/notifications")
        assert response.status_code == 401


class TestMarkNotificationRead:
    """PATCH /api/v1/notifications/{id}/read"""

    async def test_marks_the_notification_read(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user
    ):
        notification = await create_test_notification(async_session, customer_test_user)

        response = await async_client.patch(f"/api/v1/notifications/{notification.id}/read", headers=customer_auth_headers)

        assert response.status_code == 200
        assert response.json()["read_at"] is not None

    async def test_is_idempotent_on_an_already_read_notification(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user
    ):
        notification = await create_test_notification(
            async_session, customer_test_user, read_at=datetime(2020, 1, 1, tzinfo=UTC).replace(tzinfo=None)
        )

        response = await async_client.patch(f"/api/v1/notifications/{notification.id}/read", headers=customer_auth_headers)

        assert response.status_code == 200
        assert response.json()["read_at"].startswith("2020-01-01")

    async def test_other_users_notification_returns_404(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, other_customer_test_user
    ):
        notification = await create_test_notification(async_session, other_customer_test_user)

        response = await async_client.patch(f"/api/v1/notifications/{notification.id}/read", headers=customer_auth_headers)

        assert response.status_code == 404

    async def test_nonexistent_notification_returns_404(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.patch("/api/v1/notifications/999999/read", headers=customer_auth_headers)
        assert response.status_code == 404

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, async_session: AsyncSession, customer_test_user):
        notification = await create_test_notification(async_session, customer_test_user)
        response = await async_client.patch(f"/api/v1/notifications/{notification.id}/read")
        assert response.status_code == 401


class TestMarkAllNotificationsRead:
    """PATCH /api/v1/notifications/read-all"""

    async def test_marks_every_unread_notification_for_the_current_user(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user
    ):
        n1 = await create_test_notification(async_session, customer_test_user)
        n2 = await create_test_notification(async_session, customer_test_user)

        response = await async_client.patch("/api/v1/notifications/read-all", headers=customer_auth_headers)

        assert response.status_code == 204
        await async_session.refresh(n1)
        await async_session.refresh(n2)
        assert n1.read_at is not None
        assert n2.read_at is not None

    async def test_does_not_touch_other_users_notifications(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            customer_auth_headers,
            customer_test_user,
            other_customer_test_user,
    ):
        other = await create_test_notification(async_session, other_customer_test_user)

        response = await async_client.patch("/api/v1/notifications/read-all", headers=customer_auth_headers)

        assert response.status_code == 204
        await async_session.refresh(other)
        assert other.read_at is None

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.patch("/api/v1/notifications/read-all")
        assert response.status_code == 401
