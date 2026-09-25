"""Unit tests for worker_verification_service -- the CNI verification
queue's listing/document-url/approve/reject logic."""

from unittest.mock import AsyncMock, patch

import pytest

from src.app.core.exceptions.http_exceptions import BadRequestException, NotFoundException
from src.app.crud.crud_admin_action_log import crud_admin_action_log
from src.app.schemas.admin_action_log import AdminActionLogRead
from src.app.schemas.worker_profile import WorkerProfileRead
from src.app.services.worker_verification_service import (
    approve_worker_verification,
    get_verification_document_url,
    list_pending_worker_verifications,
    reject_worker_verification,
)
from tests.conftest import create_test_user, create_test_worker_profile


class TestListPendingWorkerVerifications:
    async def test_includes_unverified_profiles_with_a_document(self, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=False)
        worker.cni_document_key = "cni/1.pdf"
        await async_session.commit()

        result = await list_pending_worker_verifications(async_session)

        assert any(row.id == worker.id for row in result)

    async def test_excludes_verified_profiles(self, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=True)
        worker.cni_document_key = "cni/1.pdf"
        await async_session.commit()

        result = await list_pending_worker_verifications(async_session)

        assert all(row.id != worker.id for row in result)

    async def test_excludes_profiles_without_a_document(self, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=False)

        result = await list_pending_worker_verifications(async_session)

        assert all(row.id != worker.id for row in result)

    async def test_includes_name_email_and_profile_fields(self, async_session):
        user = await create_test_user(async_session, name="Zineb Haddad")
        worker = await create_test_worker_profile(async_session, user, bio="Electrician", years_of_experience=7)
        worker.cni_document_key = "cni/1.pdf"
        await async_session.commit()

        result = await list_pending_worker_verifications(async_session)

        row = next(r for r in result if r.id == worker.id)
        assert row.name == "Zineb Haddad"
        assert row.email == user.email
        assert row.bio == "Electrician"
        assert row.years_of_experience == 7


class TestGetVerificationDocumentUrl:
    async def test_returns_a_presigned_url(self, async_session, monkeypatch):
        worker = await create_test_worker_profile(async_session)
        worker.cni_document_key = "cni/1.pdf"
        await async_session.commit()

        monkeypatch.setattr(
            "src.app.services.worker_verification_service.minio_client.generate_presigned_get_url",
            lambda **kwargs: "https://signed.example.com/cni/1.pdf?sig=abc",
        )

        url = await get_verification_document_url(async_session, worker.id)

        assert url == "https://signed.example.com/cni/1.pdf?sig=abc"

    async def test_passes_the_verification_bucket_and_key(self, async_session, monkeypatch):
        from src.app.core.config import settings

        worker = await create_test_worker_profile(async_session)
        worker.cni_document_key = "cni/1.pdf"
        await async_session.commit()

        captured = {}

        def fake_presign(**kwargs):
            captured.update(kwargs)
            return "https://signed.example.com"

        monkeypatch.setattr("src.app.services.worker_verification_service.minio_client.generate_presigned_get_url", fake_presign)

        await get_verification_document_url(async_session, worker.id)

        assert captured["bucket"] == settings.APP_S3_BUCKET_VERIFICATION
        assert captured["key"] == "cni/1.pdf"

    async def test_raises_not_found_for_a_missing_profile(self, async_session):
        with pytest.raises(NotFoundException):
            await get_verification_document_url(async_session, 999_999)

    async def test_raises_not_found_when_no_document_uploaded(self, async_session):
        worker = await create_test_worker_profile(async_session)

        with pytest.raises(NotFoundException):
            await get_verification_document_url(async_session, worker.id)


class TestApproveWorkerVerification:
    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_sets_is_verified_true(self, mock_notify, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=False)

        result = await approve_worker_verification(async_session, worker.id)

        assert isinstance(result, WorkerProfileRead)
        assert result.is_verified is True

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_sends_the_approved_notification(self, mock_notify, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=False)

        await approve_worker_verification(async_session, worker.id)

        mock_notify.assert_awaited_once()
        kwargs = mock_notify.await_args.kwargs
        assert kwargs["event_type"] == "worker_verification_approved"
        assert kwargs["user_id"] == worker.user_id

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_writes_an_audit_log_entry_when_admin_id_given(self, mock_notify, async_session):
        admin = await create_test_user(async_session, is_superuser=True)
        worker = await create_test_worker_profile(async_session, is_verified=False)

        await approve_worker_verification(async_session, worker.id, admin_id=admin.id)

        result = await crud_admin_action_log.get_multi(
            db=async_session, target_type="worker_profile", target_id=worker.id,
            schema_to_select=AdminActionLogRead, return_as_model=True,
        )
        entries = result["data"]
        assert len(entries) == 1
        assert entries[0].action == "approve_worker_verification"
        assert entries[0].actor_id == admin.id

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_no_audit_log_written_without_an_admin_id(self, mock_notify, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=False)

        await approve_worker_verification(async_session, worker.id)

        result = await crud_admin_action_log.get_multi(
            db=async_session, target_type="worker_profile", target_id=worker.id,
            schema_to_select=AdminActionLogRead, return_as_model=True,
        )
        assert result["data"] == []

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_already_verified_does_not_notify_again(self, mock_notify, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=True)

        await approve_worker_verification(async_session, worker.id)

        mock_notify.assert_not_awaited()

    async def test_raises_not_found_for_a_missing_profile(self, async_session):
        with pytest.raises(NotFoundException):
            await approve_worker_verification(async_session, 999_999)


class TestRejectWorkerVerification:
    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_clears_the_cni_document_key(self, mock_notify, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=False)
        worker.cni_document_key = "cni/1.pdf"
        await async_session.commit()
        admin = await create_test_user(async_session, is_superuser=True)

        await reject_worker_verification(async_session, worker.id, admin_id=admin.id, reason="Blurry photo")

        await async_session.refresh(worker)
        assert worker.cni_document_key is None

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_does_not_set_is_verified(self, mock_notify, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=False)
        admin = await create_test_user(async_session, is_superuser=True)

        result = await reject_worker_verification(async_session, worker.id, admin_id=admin.id, reason="Blurry photo")

        assert result.is_verified is False

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_sends_the_rejected_notification_with_the_reason(self, mock_notify, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=False)
        admin = await create_test_user(async_session, is_superuser=True)

        await reject_worker_verification(async_session, worker.id, admin_id=admin.id, reason="Blurry photo")

        mock_notify.assert_awaited_once()
        kwargs = mock_notify.await_args.kwargs
        assert kwargs["event_type"] == "worker_verification_rejected"
        assert kwargs["user_id"] == worker.user_id
        assert "Blurry photo" in kwargs["body_en"]

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_writes_an_audit_log_entry_with_the_reason(self, mock_notify, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=False)
        admin = await create_test_user(async_session, is_superuser=True)

        await reject_worker_verification(async_session, worker.id, admin_id=admin.id, reason="Blurry photo")

        result = await crud_admin_action_log.get_multi(
            db=async_session, target_type="worker_profile", target_id=worker.id,
            schema_to_select=AdminActionLogRead, return_as_model=True,
        )
        entries = result["data"]
        assert len(entries) == 1
        assert entries[0].action == "reject_worker_verification"
        assert entries[0].actor_id == admin.id
        assert entries[0].reason == "Blurry photo"

    async def test_raises_bad_request_if_already_verified(self, async_session):
        worker = await create_test_worker_profile(async_session, is_verified=True)
        admin = await create_test_user(async_session, is_superuser=True)

        with pytest.raises(BadRequestException):
            await reject_worker_verification(async_session, worker.id, admin_id=admin.id, reason="Blurry photo")

    async def test_raises_not_found_for_a_missing_profile(self, async_session):
        admin = await create_test_user(async_session, is_superuser=True)

        with pytest.raises(NotFoundException):
            await reject_worker_verification(async_session, 999_999, admin_id=admin.id, reason="Blurry photo")
