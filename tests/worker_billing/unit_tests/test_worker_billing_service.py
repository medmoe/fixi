"""Unit tests for worker_billing_service.mark_worker_billing_paid -- the
admin action that settles an outstanding commission through PaymentService
(never a concrete provider directly, see tests/payments/)."""

import csv
import io
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest

from src.app.core.exceptions.http_exceptions import BadRequestException, NotFoundException
from src.app.models import Payment, PaymentStatus, WorkerBillingStatus
from src.app.schemas.worker_billing import WorkerBillingAdminFilter, WorkerBillingDisplayStatus
from src.app.services.payments import PaymentResult
from src.app.services.worker_billing_service import export_worker_billing_csv, list_worker_billing_admin, mark_worker_billing_paid
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


class TestListWorkerBillingAdmin:
    """Unit tests for the filterable/exportable admin commission dashboard
    (Phase 8 Issue 6) -- status filtering must correctly split the
    never-persisted OVERDUE status out of PENDING based on due_date."""

    async def test_includes_worker_name_and_email(self, async_session, test_job, test_worker_profile, test_user):
        await create_test_worker_billing(async_session, test_worker_profile, test_job)

        rows = await list_worker_billing_admin(async_session, WorkerBillingAdminFilter())

        assert len(rows) == 1
        assert rows[0].worker_name == test_user.name
        assert rows[0].worker_email == test_user.email

    async def test_filters_by_worker_profile_id(
            self, async_session, test_job, test_worker_profile, test_other_worker_profile,
            customer_test_user, test_trade_category
    ):
        from tests.job.helpers import create_test_job

        other_job = await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)
        await create_test_worker_billing(async_session, test_worker_profile, test_job)
        await create_test_worker_billing(async_session, test_other_worker_profile, other_job)

        rows = await list_worker_billing_admin(async_session, WorkerBillingAdminFilter(worker_profile_id=test_worker_profile.id))

        assert len(rows) == 1
        assert rows[0].worker_profile_id == test_worker_profile.id

    async def test_filters_paid(self, async_session, test_job, test_worker_profile):
        await create_test_worker_billing(async_session, test_worker_profile, test_job, status=WorkerBillingStatus.PAID, amount_paid=Decimal("5.00"))

        rows = await list_worker_billing_admin(async_session, WorkerBillingAdminFilter(status=WorkerBillingDisplayStatus.paid))

        assert len(rows) == 1
        assert rows[0].status == WorkerBillingStatus.PAID

    async def test_filters_pending_excludes_overdue(self, async_session, test_job, test_worker_profile):
        await create_test_worker_billing(async_session, test_worker_profile, test_job, due_date=datetime.now(UTC) - timedelta(days=1))

        rows = await list_worker_billing_admin(async_session, WorkerBillingAdminFilter(status=WorkerBillingDisplayStatus.pending))

        assert rows == []

    async def test_filters_overdue_excludes_pending(self, async_session, test_job, test_worker_profile):
        await create_test_worker_billing(async_session, test_worker_profile, test_job, due_date=datetime.now(UTC) + timedelta(days=1))

        rows = await list_worker_billing_admin(async_session, WorkerBillingAdminFilter(status=WorkerBillingDisplayStatus.overdue))

        assert rows == []

    async def test_filters_overdue_matches_pending_past_due_date(self, async_session, test_job, test_worker_profile):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job, due_date=datetime.now(UTC) - timedelta(days=1))

        rows = await list_worker_billing_admin(async_session, WorkerBillingAdminFilter(status=WorkerBillingDisplayStatus.overdue))

        assert len(rows) == 1
        assert rows[0].id == billing.id
        assert rows[0].is_overdue is True

    async def test_filters_by_due_date_range(self, async_session, test_job, test_worker_profile, test_other_worker_profile, customer_test_user, test_trade_category):
        from tests.job.helpers import create_test_job

        other_job = await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)
        await create_test_worker_billing(async_session, test_worker_profile, test_job, due_date=datetime.now(UTC) + timedelta(days=5))
        await create_test_worker_billing(async_session, test_other_worker_profile, other_job, due_date=datetime.now(UTC) + timedelta(days=30))

        rows = await list_worker_billing_admin(
            async_session,
            WorkerBillingAdminFilter(due_date_from=datetime.now(UTC), due_date_to=datetime.now(UTC) + timedelta(days=10)),
        )

        assert len(rows) == 1
        assert rows[0].worker_profile_id == test_worker_profile.id


class TestExportWorkerBillingCsv:
    async def test_matches_list_worker_billing_admin(self, async_session, test_job, test_worker_profile):
        await create_test_worker_billing(async_session, test_worker_profile, test_job, amount_owed=Decimal("5.00"))
        filters = WorkerBillingAdminFilter()

        rows = await list_worker_billing_admin(async_session, filters)
        csv_text = await export_worker_billing_csv(async_session, filters)

        reader = csv.DictReader(io.StringIO(csv_text))
        csv_rows = list(reader)
        assert len(csv_rows) == len(rows)
        assert csv_rows[0]["worker_profile_id"] == str(rows[0].worker_profile_id)
        assert Decimal(csv_rows[0]["amount_owed"]) == rows[0].amount_owed

    async def test_empty_when_no_matching_records(self, async_session):
        csv_text = await export_worker_billing_csv(async_session, WorkerBillingAdminFilter(worker_profile_id=999_999))

        reader = csv.DictReader(io.StringIO(csv_text))
        assert list(reader) == []
