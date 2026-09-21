from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_user

WEBHOOK_URL = "/api/v1/notifications/email/webhook"


class TestMailjetEmailWebhook:
    async def test_rejects_a_request_with_no_secret_configured(self, async_client: AsyncClient):
        # settings.MAILJET_WEBHOOK_SECRET is unset in the test environment.
        response = await async_client.post(WEBHOOK_URL, json={"event": "bounce", "email": "someone@example.com"})
        assert response.status_code == 403

    async def test_rejects_a_request_with_the_wrong_secret(self, async_client: AsyncClient, monkeypatch):
        monkeypatch.setattr("src.app.api.v1.notifications.settings.MAILJET_WEBHOOK_SECRET", "correct-secret")
        response = await async_client.post(
            f"{WEBHOOK_URL}?secret=wrong-secret", json={"event": "bounce", "email": "someone@example.com"}
        )
        assert response.status_code == 403

    async def test_flips_email_invalid_on_a_bounce_event(self, async_client: AsyncClient, async_session: AsyncSession, monkeypatch):
        monkeypatch.setattr("src.app.api.v1.notifications.settings.MAILJET_WEBHOOK_SECRET", "correct-secret")
        user = await create_test_user(async_session)

        response = await async_client.post(f"{WEBHOOK_URL}?secret=correct-secret", json={"event": "bounce", "email": user.email})

        assert response.status_code == 200
        await async_session.refresh(user)
        assert user.email_invalid is True

    async def test_flips_email_invalid_on_a_spam_complaint(self, async_client: AsyncClient, async_session: AsyncSession, monkeypatch):
        monkeypatch.setattr("src.app.api.v1.notifications.settings.MAILJET_WEBHOOK_SECRET", "correct-secret")
        user = await create_test_user(async_session)

        response = await async_client.post(f"{WEBHOOK_URL}?secret=correct-secret", json={"event": "spam", "email": user.email})

        assert response.status_code == 200
        await async_session.refresh(user)
        assert user.email_invalid is True

    async def test_handles_a_batch_array_payload(self, async_client: AsyncClient, async_session: AsyncSession, monkeypatch):
        monkeypatch.setattr("src.app.api.v1.notifications.settings.MAILJET_WEBHOOK_SECRET", "correct-secret")
        user1 = await create_test_user(async_session)
        user2 = await create_test_user(async_session)

        response = await async_client.post(
            f"{WEBHOOK_URL}?secret=correct-secret",
            json=[{"event": "bounce", "email": user1.email}, {"event": "blocked", "email": user2.email}],
        )

        assert response.status_code == 200
        assert response.json()["received"] == 2
        await async_session.refresh(user1)
        await async_session.refresh(user2)
        assert user1.email_invalid is True
        assert user2.email_invalid is True

    async def test_does_not_flip_email_invalid_for_a_non_bounce_event(
            self, async_client: AsyncClient, async_session: AsyncSession, monkeypatch
    ):
        monkeypatch.setattr("src.app.api.v1.notifications.settings.MAILJET_WEBHOOK_SECRET", "correct-secret")
        user = await create_test_user(async_session)

        response = await async_client.post(f"{WEBHOOK_URL}?secret=correct-secret", json={"event": "open", "email": user.email})

        assert response.status_code == 200
        await async_session.refresh(user)
        assert user.email_invalid is False

    async def test_unknown_email_address_is_a_no_op_not_an_error(self, async_client: AsyncClient, monkeypatch):
        monkeypatch.setattr("src.app.api.v1.notifications.settings.MAILJET_WEBHOOK_SECRET", "correct-secret")
        response = await async_client.post(
            f"{WEBHOOK_URL}?secret=correct-secret", json={"event": "bounce", "email": "nobody-here@example.com"}
        )
        assert response.status_code == 200
