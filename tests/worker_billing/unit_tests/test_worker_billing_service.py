"""Unit tests for worker_billing_service.mark_worker_billing_paid -- the
admin action that settles an outstanding commission through PaymentService
(never a concrete provider directly, see tests/payments/)."""

from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest

from src.app.core.exceptions.http_exceptions import BadRequestException, NotFoundException
from src.app.models import Payment, PaymentStatus, WorkerBillingStatus
from src.app.services.payments import PaymentResult
from src.app.services.worker_billing_service import mark_worker_billing_paid
from tests.conftest import create_test_worker_billing


class TestMarkWorkerBillingPaid:
    async def test_marks_the_record_paid(self, async_session, monkeypatch, test_job, test_worker_profile, test_admin_user):
        monkeypatch.setattr("src.app.services.payments.service.settings.PAYMENT_PROVIDER", "cash")
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job, amount_owed=Decimal("5.00"))

        result = await mark_worker_billing_paid(async_session, billing.id, recorded_by=test_admin_user.id)

        assert result.status == WorkerBillingStatus.PAID
        assert result.amount_paid == Decimal("5.00")
        assert result.payment_id is not None

    async def test_records_a_payment_referencing_the_billing_row(
            self, async_session, monkeypatch, test_job, test_worker_profile, test_admin_user
    ):
        monkeypatch.setattr("src.app.services.payments.service.settings.PAYMENT_PROVIDER", "cash")
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job, amount_owed=Decimal("5.00"))

        result = await mark_worker_billing_paid(async_session, billing.id, recorded_by=test_admin_user.id)

        payment = await async_session.get(Payment, result.payment_id)
        assert payment is not None
        assert payment.payer_id == test_worker_profile.user_id
        assert payment.payee_id is None  # the platform, not a specific recipient user
        assert payment.subscription_id == billing.id
        assert payment.recorded_by == test_admin_user.id
        assert payment.status == PaymentStatus.COMPLETED

    async def test_pays_only_the_outstanding_balance(
            self, async_session, monkeypatch, test_job, test_worker_profile, test_admin_user
    ):
        monkeypatch.setattr("src.app.services.payments.service.settings.PAYMENT_PROVIDER", "cash")
        billing = await create_test_worker_billing(
            async_session, test_worker_profile, test_job, amount_owed=Decimal("5.00"), amount_paid=Decimal("2.00"),
        )

        result = await mark_worker_billing_paid(async_session, billing.id, recorded_by=test_admin_user.id)

        payment = await async_session.get(Payment, result.payment_id)
        assert payment.amount == Decimal("3.00")

    async def test_raises_not_found_for_a_missing_billing_record(self, async_session, test_admin_user):
        with pytest.raises(NotFoundException):
            await mark_worker_billing_paid(async_session, 999_999, recorded_by=test_admin_user.id)

    async def test_raises_bad_request_if_already_paid(self, async_session, test_job, test_worker_profile, test_admin_user):
        billing = await create_test_worker_billing(
            async_session, test_worker_profile, test_job, status=WorkerBillingStatus.PAID, amount_paid=Decimal("5.00"),
        )

        with pytest.raises(BadRequestException):
            await mark_worker_billing_paid(async_session, billing.id, recorded_by=test_admin_user.id)

    async def test_propagates_a_failed_payment_as_bad_request(
            self, async_session, test_job, test_worker_profile, test_admin_user
    ):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)

        failing_service = AsyncMock()
        failing_service.record_payment = AsyncMock(
            return_value=PaymentResult(success=False, provider="cash", error="insufficient funds")
        )
        with patch("src.app.services.worker_billing_service.PaymentService", return_value=failing_service):
            with pytest.raises(BadRequestException, match="insufficient funds"):
                await mark_worker_billing_paid(async_session, billing.id, recorded_by=test_admin_user.id)
