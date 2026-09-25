"""Unit tests for admin_user_service -- listing/search/filter, suspend/
reactivate business rules, and the audit log they write to."""

import pytest

from src.app.core.exceptions.http_exceptions import BadRequestException, ForbiddenException, NotFoundException
from src.app.models import UserRole
from src.app.schemas.user import UserAdminFilter
from src.app.services.admin_user_service import get_user_audit_log, get_user_detail, list_users, reactivate_user, suspend_user
from tests.conftest import create_test_user


def as_admin(user) -> dict:
    return {"id": user.id, "is_superuser": True}


class TestListUsers:
    async def test_returns_all_non_deleted_users_when_no_filters(self, async_session):
        await create_test_user(async_session, name="Alice Example")
        await create_test_user(async_session, name="Bob Example")

        result = await list_users(async_session, UserAdminFilter())

        assert result.total_count >= 2

    async def test_search_matches_name_case_insensitively(self, async_session):
        await create_test_user(async_session, name="Zineb Haddad")
        await create_test_user(async_session, name="Someone Else")

        result = await list_users(async_session, UserAdminFilter(search="zineb"))

        assert result.total_count == 1
        assert result.data[0].name == "Zineb Haddad"

    async def test_search_matches_username(self, async_session):
        user = await create_test_user(async_session)

        result = await list_users(async_session, UserAdminFilter(search=user.username))

        assert any(u.id == user.id for u in result.data)

    async def test_search_matches_email(self, async_session):
        user = await create_test_user(async_session)

        result = await list_users(async_session, UserAdminFilter(search=user.email))

        assert any(u.id == user.id for u in result.data)

    async def test_filters_by_role_type(self, async_session):
        worker = await create_test_user(async_session, role_type=UserRole.WORKER)
        await create_test_user(async_session, role_type=UserRole.CUSTOMER)

        result = await list_users(async_session, UserAdminFilter(role_type=UserRole.WORKER))

        assert all(u.role_type == UserRole.WORKER.value for u in result.data)  # UserRead.role_type is a plain str (use_enum_values)
        assert any(u.id == worker.id for u in result.data)

    async def test_filters_by_is_suspended(self, async_session):
        suspended = await create_test_user(async_session, is_suspended=True)
        await create_test_user(async_session, is_suspended=False)

        result = await list_users(async_session, UserAdminFilter(is_suspended=True))

        assert all(u.is_suspended for u in result.data)
        assert any(u.id == suspended.id for u in result.data)

    async def test_excludes_soft_deleted_users(self, async_session):
        deleted = await create_test_user(async_session, is_deleted=True)

        result = await list_users(async_session, UserAdminFilter())

        assert all(u.id != deleted.id for u in result.data)


class TestGetUserDetail:
    async def test_returns_the_user(self, async_session):
        user = await create_test_user(async_session)

        result = await get_user_detail(async_session, user.id)

        assert result.id == user.id

    async def test_raises_not_found_for_a_missing_user(self, async_session):
        with pytest.raises(NotFoundException):
            await get_user_detail(async_session, 999_999)


class TestSuspendUser:
    async def test_suspends_the_account(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        target = await create_test_user(async_session)

        result = await suspend_user(async_session, target.id, as_admin(admin))

        assert result.is_suspended is True

    async def test_writes_an_audit_log_entry(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        target = await create_test_user(async_session)

        await suspend_user(async_session, target.id, as_admin(admin), reason="Fraud report")

        entries = await get_user_audit_log(async_session, target.id)
        assert len(entries) == 1
        assert entries[0].action == "suspend_user"
        assert entries[0].target_type == "user"
        assert entries[0].target_id == target.id
        assert entries[0].actor_id == admin.id
        assert entries[0].reason == "Fraud report"
        assert entries[0].created_at is not None

    async def test_raises_if_already_suspended(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        target = await create_test_user(async_session, is_suspended=True)

        with pytest.raises(BadRequestException):
            await suspend_user(async_session, target.id, as_admin(admin))

    async def test_raises_for_self_suspend(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)

        with pytest.raises(BadRequestException):
            await suspend_user(async_session, admin.id, as_admin(admin))

    async def test_raises_for_suspending_another_admin(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        other_admin = await create_test_user(async_session, is_superuser=True)

        with pytest.raises(ForbiddenException):
            await suspend_user(async_session, other_admin.id, as_admin(admin))

    async def test_raises_not_found_for_a_missing_user(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)

        with pytest.raises(NotFoundException):
            await suspend_user(async_session, 999_999, as_admin(admin))


class TestReactivateUser:
    async def test_reactivates_the_account(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        target = await create_test_user(async_session, is_suspended=True)

        result = await reactivate_user(async_session, target.id, as_admin(admin))

        assert result.is_suspended is False

    async def test_writes_an_audit_log_entry(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        target = await create_test_user(async_session, is_suspended=True)

        await reactivate_user(async_session, target.id, as_admin(admin), reason="Appeal approved")

        entries = await get_user_audit_log(async_session, target.id)
        assert len(entries) == 1
        assert entries[0].action == "reactivate_user"
        assert entries[0].actor_id == admin.id
        assert entries[0].reason == "Appeal approved"

    async def test_raises_if_not_suspended(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        target = await create_test_user(async_session, is_suspended=False)

        with pytest.raises(BadRequestException):
            await reactivate_user(async_session, target.id, as_admin(admin))


class TestGetUserAuditLog:
    async def test_returns_entries_most_recent_first(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        target = await create_test_user(async_session)

        await suspend_user(async_session, target.id, as_admin(admin))
        await reactivate_user(async_session, target.id, as_admin(admin))

        entries = await get_user_audit_log(async_session, target.id)

        assert len(entries) == 2
        assert entries[0].action == "reactivate_user"
        assert entries[1].action == "suspend_user"

    async def test_empty_for_a_user_with_no_actions(self, async_session):
        user = await create_test_user(async_session)

        entries = await get_user_audit_log(async_session, user.id)

        assert entries == []
