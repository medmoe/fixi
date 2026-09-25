"""Model tests for AdminActionLog -- does the DB enforce the rules?
(required fields, defaults, FK cascade)."""

import pytest

from src.app.models import AdminActionLog
from tests.conftest import create_test_user


class TestAdminActionLogCreate:
    async def test_creates_with_required_fields(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        log = AdminActionLog(action="suspend_user", target_type="user", target_id=42, actor_id=admin.id)
        async_session.add(log)
        await async_session.commit()
        await async_session.refresh(log)

        assert log.id is not None
        assert log.action == "suspend_user"
        assert log.target_type == "user"
        assert log.target_id == 42
        assert log.actor_id == admin.id
        assert log.reason is None
        assert log.created_at is not None

    async def test_actor_id_and_reason_are_optional(self, async_session):
        log = AdminActionLog(action="suspend_user", target_type="user", target_id=42)
        async_session.add(log)
        await async_session.commit()
        await async_session.refresh(log)

        assert log.actor_id is None
        assert log.reason is None

    async def test_accepts_a_reason(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        log = AdminActionLog(action="suspend_user", target_type="user", target_id=42, actor_id=admin.id, reason="Repeated policy violations")
        async_session.add(log)
        await async_session.commit()
        await async_session.refresh(log)

        assert log.reason == "Repeated policy violations"

    async def test_required_fields_cannot_be_omitted(self, async_session):
        with pytest.raises(TypeError):
            AdminActionLog(action="suspend_user", target_type="user")  # type: ignore[call-arg]


class TestAdminActionLogForeignKeys:
    async def test_deleting_the_actor_sets_actor_id_null(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        log = AdminActionLog(action="suspend_user", target_type="user", target_id=42, actor_id=admin.id)
        async_session.add(log)
        await async_session.commit()

        await async_session.delete(admin)
        await async_session.commit()
        async_session.expire_all()
        await async_session.refresh(log)

        assert log.actor_id is None
