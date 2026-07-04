# tests/unit_tests/crud_tests/test_availability_toggle.py

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.api.v1.worker_profile import toggle_worker_availability
from src.app.core.exceptions.http_exceptions import ForbiddenException
from src.app.schemas.worker_profile import (
    AvailabilityToggleRequest,
    WorkerProfileNestedRead,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_worker_profile(
        worker_profile_id: int = 1,
        user_id: int = 42,
        is_available: bool = False,
) -> MagicMock:
    """Mock WorkerProfileNestedRead instance."""
    profile = MagicMock(spec=WorkerProfileNestedRead)
    profile.id = worker_profile_id
    profile.is_available = is_available
    profile.available_since = None
    profile.user = MagicMock()
    profile.user.id = user_id
    return profile


def make_current_user(user_id: int = 42, is_superuser: bool = False) -> dict:
    return {"id": user_id, "is_superuser": is_superuser}


def make_db() -> AsyncMock:
    return AsyncMock(spec=AsyncSession)


# ─── TestToggleOn ─────────────────────────────────────────────────────────────

class TestToggleAvailabilityOn:
    async def _set_up_toggle_on_request(self):
        db = make_db()
        profile = make_worker_profile(is_available=False)
        current_user = make_current_user()

        with (
            patch(
                "src.app.api.v1.worker_profile._get_worker_profile_or_404",
                new=AsyncMock(return_value=profile),
            ),
            patch(
                "src.app.api.v1.worker_profile.crud_worker_profiles.update",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "src.app.api.v1.worker_profile.publish",
                new=AsyncMock(return_value=None),
            ),
        ):
            result = await toggle_worker_availability(
                worker_profile_id=1,
                body=AvailabilityToggleRequest(is_available=True),
                db=db,
                current_user=current_user,
            )
        return result

    async def test_toggle_on_returns_is_available_true(self):
        result = await self._set_up_toggle_on_request()
        assert result.is_available is True

    async def test_toggle_on_sets_available_since(self):
        result = await self._set_up_toggle_on_request()
        assert result.available_since is not None
        assert isinstance(result.available_since, datetime)

    async def test_toggle_on_publishes_event(self):
        db = make_db()
        profile = make_worker_profile()
        current_user = make_current_user()
        mock_publish = AsyncMock()

        with (
            patch(
                "src.app.api.v1.worker_profile._get_worker_profile_or_404",
                new=AsyncMock(return_value=profile),
            ),
            patch(
                "src.app.api.v1.worker_profile.crud_worker_profiles.update",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "src.app.api.v1.worker_profile.publish",
                new=mock_publish,
            ),
        ):
            await toggle_worker_availability(
                worker_profile_id=1,
                body=AvailabilityToggleRequest(is_available=True),
                db=db,
                current_user=current_user,
            )

        mock_publish.assert_called_once()
        call_args = mock_publish.call_args
        assert call_args[0][0] == "worker_profile:availability_changed"
        assert call_args[0][1]["is_available"] is True
        assert call_args[0][1]["worker_profile_id"] == 1


# ─── TestToggleOff ────────────────────────────────────────────────────────────

class TestToggleAvailabilityOff:
    async def _set_toggle_off_request(self):
        db = make_db()
        profile = make_worker_profile(is_available=True)
        current_user = make_current_user()

        with (
            patch(
                "src.app.api.v1.worker_profile._get_worker_profile_or_404",
                new=AsyncMock(return_value=profile),
            ),
            patch(
                "src.app.api.v1.worker_profile.crud_worker_profiles.update",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "src.app.api.v1.worker_profile.publish",
                new=AsyncMock(return_value=None),
            ),
        ):
            result = await toggle_worker_availability(
                worker_profile_id=1,
                body=AvailabilityToggleRequest(is_available=False),
                db=db,
                current_user=current_user,
            )
        return result

    async def test_toggle_off_returns_is_available_false(self):
        result = await self._set_toggle_off_request()
        assert result.is_available is False

    async def test_toggle_off_does_not_set_available_since(self):
        result = await self._set_toggle_off_request()
        assert result.available_since is None

    async def test_toggle_off_publishes_event(self):
        db = make_db()
        profile = make_worker_profile(is_available=True)
        current_user = make_current_user()
        mock_publish = AsyncMock()

        with (
            patch(
                "src.app.api.v1.worker_profile._get_worker_profile_or_404",
                new=AsyncMock(return_value=profile),
            ),
            patch(
                "src.app.api.v1.worker_profile.crud_worker_profiles.update",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "src.app.api.v1.worker_profile.publish",
                new=mock_publish,
            ),
        ):
            await toggle_worker_availability(
                worker_profile_id=1,
                body=AvailabilityToggleRequest(is_available=False),
                db=db,
                current_user=current_user,
            )

        mock_publish.assert_called_once()
        call_args = mock_publish.call_args
        assert call_args[0][1]["is_available"] is False
        assert call_args[0][1]["available_since"] is None


# ─── TestUnauthorized ─────────────────────────────────────────────────────────

class TestUnauthorizedToggle:
    async def test_other_user_raises_forbidden(self):
        db = make_db()
        profile = make_worker_profile(user_id=42)
        other_user = make_current_user(user_id=99, is_superuser=False)  # different user

        with (
            patch(
                "src.app.api.v1.worker_profile._get_worker_profile_or_404",
                new=AsyncMock(return_value=profile),
            ),
        ):
            with pytest.raises(ForbiddenException):
                await toggle_worker_availability(
                    worker_profile_id=1,
                    body=AvailabilityToggleRequest(is_available=True),
                    db=db,
                    current_user=other_user,
                )

    async def test_admin_can_toggle_any_profile(self):
        db = make_db()
        profile = make_worker_profile(user_id=42)
        admin = make_current_user(user_id=99, is_superuser=True)  # different user but admin

        with (
            patch(
                "src.app.api.v1.worker_profile._get_worker_profile_or_404",
                new=AsyncMock(return_value=profile),
            ),
            patch(
                "src.app.api.v1.worker_profile.crud_worker_profiles.update",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "src.app.api.v1.worker_profile.publish",
                new=AsyncMock(return_value=None),
            ),
        ):
            result = await toggle_worker_availability(
                worker_profile_id=1,
                body=AvailabilityToggleRequest(is_available=True),
                db=db,
                current_user=admin,
            )

        assert result.is_available is True

    async def test_update_called_with_correct_fields(self):
        db = make_db()
        profile = make_worker_profile()
        current_user = make_current_user()
        mock_update = AsyncMock(return_value=None)

        with (
            patch(
                "src.app.api.v1.worker_profile._get_worker_profile_or_404",
                new=AsyncMock(return_value=profile),
            ),
            patch(
                "src.app.api.v1.worker_profile.crud_worker_profiles.update",
                new=mock_update,
            ),
            patch(
                "src.app.api.v1.worker_profile.publish",
                new=AsyncMock(return_value=None),
            ),
        ):
            await toggle_worker_availability(
                worker_profile_id=1,
                body=AvailabilityToggleRequest(is_available=True),
                db=db,
                current_user=current_user,
            )

        mock_update.assert_called_once()
        call_kwargs = mock_update.call_args.kwargs
        print(call_kwargs)
        assert call_kwargs["object"].is_available is True
        assert call_kwargs["object"].available_since is not None
        assert call_kwargs["user_id"] == 42
