"""Model tests for WorkerBilling -- does the DB enforce the rules?
(constraints, nulls, FKs, cascades)."""

from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError

from src.app.models import WorkerBilling, WorkerBillingStatus
from tests.conftest import create_test_worker_billing
from tests.job.helpers import create_test_job


class TestWorkerBillingCreate:
    async def test_creates_with_defaults(self, async_session, test_job, test_worker_profile):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)

        assert billing.id is not None
        assert billing.worker_profile_id == test_worker_profile.id
        assert billing.job_id == test_job.id
        assert billing.amount_owed == Decimal("5.00")
        assert billing.amount_paid == Decimal("0.00")
        assert billing.status == WorkerBillingStatus.PENDING
        assert billing.payment_id is None
        assert billing.created_at is not None

    async def test_amount_paid_defaults_to_zero_when_not_set(self, async_session, test_job, test_worker_profile):
        from datetime import UTC, datetime, timedelta

        billing = WorkerBilling(
            worker_profile_id=test_worker_profile.id, job_id=test_job.id,
            amount_owed=Decimal("5.00"), due_date=datetime.now(UTC) + timedelta(days=14),
        )
        async_session.add(billing)
        await async_session.commit()
        await async_session.refresh(billing)

        assert billing.amount_paid == Decimal("0.00")
        assert billing.status == WorkerBillingStatus.PENDING


class TestWorkerBillingForeignKeys:
    async def test_worker_profile_id_and_job_id_are_required(self, async_session):
        from datetime import UTC, datetime

        with pytest.raises(TypeError):
            WorkerBilling(amount_owed=Decimal("5.00"), due_date=datetime.now(UTC))  # type: ignore[call-arg]

    async def test_rejects_a_nonexistent_worker_profile(self, async_session, test_job):
        from datetime import UTC, datetime, timedelta

        billing = WorkerBilling(
            worker_profile_id=999_999, job_id=test_job.id,
            amount_owed=Decimal("5.00"), due_date=datetime.now(UTC) + timedelta(days=14),
        )
        async_session.add(billing)
        with pytest.raises(IntegrityError):
            await async_session.commit()

    async def test_rejects_a_nonexistent_job(self, async_session, test_worker_profile):
        from datetime import UTC, datetime, timedelta

        billing = WorkerBilling(
            worker_profile_id=test_worker_profile.id, job_id=999_999,
            amount_owed=Decimal("5.00"), due_date=datetime.now(UTC) + timedelta(days=14),
        )
        async_session.add(billing)
        with pytest.raises(IntegrityError):
            await async_session.commit()

    async def test_job_id_is_unique(self, async_session, test_job, test_worker_profile):
        await create_test_worker_billing(async_session, test_worker_profile, test_job)

        with pytest.raises(IntegrityError):
            await create_test_worker_billing(async_session, test_worker_profile, test_job)

    async def test_deleting_the_job_cascades(self, async_session, customer_test_user, test_trade_category, test_worker_profile):
        job = await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)
        billing = await create_test_worker_billing(async_session, test_worker_profile, job)
        billing_id = billing.id

        await async_session.delete(job)
        await async_session.commit()
        async_session.expire_all()

        assert await async_session.get(WorkerBilling, billing_id) is None

    async def test_deleting_the_worker_profile_cascades(self, async_session, test_job, test_worker_profile):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)
        billing_id = billing.id

        await async_session.delete(test_worker_profile)
        await async_session.commit()
        async_session.expire_all()

        assert await async_session.get(WorkerBilling, billing_id) is None

    async def test_deleting_the_payment_sets_payment_id_null(self, async_session, test_job, test_worker_profile, test_user):
        from tests.conftest import create_test_payment

        payment = await create_test_payment(async_session, test_user)
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job, payment_id=payment.id)

        await async_session.delete(payment)
        await async_session.commit()
        async_session.expire_all()
        await async_session.refresh(billing)

        assert billing.payment_id is None
