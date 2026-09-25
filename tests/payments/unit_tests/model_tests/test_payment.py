"""Model tests for Payment -- does the DB enforce the rules? (constraints,
nulls, FKs, cascades)."""

from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError

from src.app.models import Payment, PaymentMethod, PaymentStatus
from tests.conftest import create_test_payment, create_test_user
from tests.job.helpers import create_test_job


class TestPaymentCreate:
    async def test_creates_with_defaults(self, async_session):
        payer = await create_test_user(async_session)
        payment = await create_test_payment(async_session, payer)

        assert payment.id is not None
        assert payment.payer_id == payer.id
        assert payment.amount == Decimal("50.00")
        assert payment.method == PaymentMethod.CASH
        assert payment.status == PaymentStatus.COMPLETED
        assert payment.job_id is None
        assert payment.subscription_id is None
        assert payment.payee_id is None
        assert payment.recorded_by is None
        assert payment.created_at is not None

    async def test_status_defaults_to_pending_when_not_set(self, async_session):
        payer = await create_test_user(async_session)
        payment = Payment(payer_id=payer.id, amount=Decimal("10.00"), method=PaymentMethod.CASH)
        async_session.add(payment)
        await async_session.commit()
        await async_session.refresh(payment)

        assert payment.status == PaymentStatus.PENDING

    async def test_links_to_a_job(self, async_session):
        customer = await create_test_user(async_session)
        job = await create_test_job(async_session, customer)
        payment = await create_test_payment(async_session, customer, job_id=job.id)

        assert payment.job_id == job.id

    async def test_payee_can_be_a_different_user(self, async_session):
        payer = await create_test_user(async_session)
        payee = await create_test_user(async_session)
        payment = await create_test_payment(async_session, payer, payee_id=payee.id)

        assert payment.payee_id == payee.id

    async def test_payee_can_be_null_for_platform_payments(self, async_session):
        payer = await create_test_user(async_session)
        payment = await create_test_payment(async_session, payer, payee_id=None)

        assert payment.payee_id is None

    async def test_recorded_by_tracks_who_entered_it(self, async_session):
        payer = await create_test_user(async_session)
        admin = await create_test_user(async_session)
        payment = await create_test_payment(async_session, payer, recorded_by=admin.id)

        assert payment.recorded_by == admin.id


class TestPaymentForeignKeys:
    async def test_payer_id_is_required(self, async_session):
        with pytest.raises(TypeError):
            Payment(amount=Decimal("10.00"), method=PaymentMethod.CASH)  # type: ignore[call-arg]

    async def test_rejects_a_nonexistent_payer(self, async_session):
        payment = Payment(payer_id=999_999, amount=Decimal("10.00"), method=PaymentMethod.CASH)
        async_session.add(payment)
        with pytest.raises(IntegrityError):
            await async_session.commit()

    async def test_deleting_the_job_sets_job_id_null(self, async_session):
        customer = await create_test_user(async_session)
        job = await create_test_job(async_session, customer)
        payment = await create_test_payment(async_session, customer, job_id=job.id)

        await async_session.delete(job)
        await async_session.commit()
        await async_session.refresh(payment)

        assert payment.job_id is None

    async def test_deleting_the_payer_cascades(self, async_session):
        payer = await create_test_user(async_session)
        payment = await create_test_payment(async_session, payer)
        payment_id = payment.id

        await async_session.delete(payer)
        await async_session.commit()

        # The row was removed by the DB's ON DELETE CASCADE, not via an ORM
        # relationship cascade -- the session's identity map doesn't know
        # that on its own, so session.get() would return the now-stale
        # cached object without this.
        async_session.expire_all()
        assert await async_session.get(Payment, payment_id) is None
