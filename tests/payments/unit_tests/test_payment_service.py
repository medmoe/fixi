"""Unit tests for the payment abstraction (PaymentService + providers),
using a fake provider so the resolution/delegation seam is exercised
without touching a real payment backend -- mirrors
tests/notifications/unit_tests/test_notification_service.py's approach."""

from decimal import Decimal
from typing import Any

import pytest

from src.app.models.payment import PaymentMethod, PaymentStatus
from src.app.services.payments import CashProvider, ChargilyProvider, PaymentProvider, PaymentResult, PaymentService
from tests.conftest import create_test_payment, create_test_user
from tests.job.helpers import create_test_job


class FakeProvider(PaymentProvider):
    """Records every call so PaymentService's delegation can be asserted
    without exercising a real provider's DB writes."""

    name = "fake"

    def __init__(self) -> None:
        self.record_calls: list[dict[str, Any]] = []
        self.get_status_calls: list[int] = []
        self.refund_calls: list[int] = []

    async def record_payment(self, db, *, payer_id, amount, payee_id=None, job_id=None, subscription_id=None, recorded_by=None) -> PaymentResult:
        self.record_calls.append({
            "payer_id": payer_id, "amount": amount, "payee_id": payee_id,
            "job_id": job_id, "subscription_id": subscription_id, "recorded_by": recorded_by,
        })
        return PaymentResult(success=True, provider=self.name, payment_id=1, status=PaymentStatus.COMPLETED)

    async def get_status(self, db, payment_id) -> PaymentResult:
        self.get_status_calls.append(payment_id)
        return PaymentResult(success=True, provider=self.name, payment_id=payment_id, status=PaymentStatus.COMPLETED)

    async def refund(self, db, payment_id) -> PaymentResult:
        self.refund_calls.append(payment_id)
        return PaymentResult(success=True, provider=self.name, payment_id=payment_id, status=PaymentStatus.REFUNDED)


class TestPaymentServiceDelegation:
    """PaymentService never implements payment logic itself -- it only
    resolves a provider and delegates. An injected provider (like a
    real config-resolved one) is never touched directly by callers."""

    async def test_record_payment_delegates_to_the_provider(self, async_session):
        fake = FakeProvider()
        service = PaymentService(provider=fake)

        result = await service.record_payment(async_session, payer_id=1, amount=Decimal("25.00"))

        assert result.success is True
        assert result.provider == "fake"
        assert fake.record_calls == [{
            "payer_id": 1, "amount": Decimal("25.00"), "payee_id": None,
            "job_id": None, "subscription_id": None, "recorded_by": None,
        }]

    async def test_get_status_delegates_to_the_provider(self, async_session):
        fake = FakeProvider()
        service = PaymentService(provider=fake)

        result = await service.get_status(async_session, 42)

        assert result.payment_id == 42
        assert fake.get_status_calls == [42]

    async def test_refund_delegates_to_the_provider(self, async_session):
        fake = FakeProvider()
        service = PaymentService(provider=fake)

        result = await service.refund(async_session, 42)

        assert result.status == PaymentStatus.REFUNDED
        assert fake.refund_calls == [42]


class TestPaymentServiceConfigDrivenDefaults:
    async def test_defaults_to_the_cash_provider_when_not_overridden(self, async_session, monkeypatch):
        # Pinned explicitly rather than relying on the AppSettings default --
        # PAYMENT_PROVIDER is read from the real `.env` (not `.env.test`,
        # same as NOTIFICATION_EMAIL_PROVIDER), so a machine with a
        # different local override would otherwise make this test flaky.
        monkeypatch.setattr("src.app.services.payments.service.settings.PAYMENT_PROVIDER", "cash")
        service = PaymentService()

        payer = await create_test_user(async_session)
        result = await service.record_payment(async_session, payer_id=payer.id, amount=Decimal("10.00"))

        assert result.success is True
        assert result.provider == "cash"

    async def test_raises_for_an_unknown_provider(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.payments.service.settings.PAYMENT_PROVIDER", "unknown")
        service = PaymentService()

        with pytest.raises(ValueError, match="Unknown payment provider"):
            await service.record_payment(async_session, payer_id=1, amount=Decimal("10.00"))


class TestCashProviderRecordPayment:
    async def test_creates_a_completed_payment(self, async_session):
        provider = CashProvider()
        payer = await create_test_user(async_session)

        result = await provider.record_payment(async_session, payer_id=payer.id, amount=Decimal("100.00"))

        assert result.success is True
        assert result.status == PaymentStatus.COMPLETED
        assert result.payment_id is not None

    async def test_links_to_a_job(self, async_session):
        provider = CashProvider()
        customer = await create_test_user(async_session)
        job = await create_test_job(async_session, customer)

        result = await provider.record_payment(async_session, payer_id=customer.id, amount=Decimal("75.00"), job_id=job.id)

        assert result.success is True

    async def test_rejects_a_non_positive_amount(self, async_session):
        provider = CashProvider()
        payer = await create_test_user(async_session)

        result = await provider.record_payment(async_session, payer_id=payer.id, amount=Decimal("0.00"))

        assert result.success is False
        assert result.error is not None

    async def test_rejects_negative_amount(self, async_session):
        provider = CashProvider()
        payer = await create_test_user(async_session)

        result = await provider.record_payment(async_session, payer_id=payer.id, amount=Decimal("-5.00"))

        assert result.success is False

    async def test_rejects_both_job_id_and_subscription_id(self, async_session):
        provider = CashProvider()
        customer = await create_test_user(async_session)
        job = await create_test_job(async_session, customer)

        result = await provider.record_payment(
            async_session, payer_id=customer.id, amount=Decimal("10.00"), job_id=job.id, subscription_id=999,
        )

        assert result.success is False
        assert "not both" in (result.error or "")


class TestCashProviderGetStatus:
    async def test_returns_the_current_status(self, async_session):
        provider = CashProvider()
        payer = await create_test_user(async_session)
        payment = await create_test_payment(async_session, payer, status=PaymentStatus.COMPLETED)

        result = await provider.get_status(async_session, payment.id)

        assert result.success is True
        assert result.status == PaymentStatus.COMPLETED

    async def test_reports_failure_for_a_missing_payment(self, async_session):
        provider = CashProvider()

        result = await provider.get_status(async_session, 999_999)

        assert result.success is False
        assert result.error is not None


class TestCashProviderRefund:
    async def test_marks_a_completed_payment_refunded(self, async_session):
        provider = CashProvider()
        payer = await create_test_user(async_session)
        payment = await create_test_payment(async_session, payer, status=PaymentStatus.COMPLETED)

        result = await provider.refund(async_session, payment.id)

        assert result.success is True
        assert result.status == PaymentStatus.REFUNDED

        status_after = await provider.get_status(async_session, payment.id)
        assert status_after.status == PaymentStatus.REFUNDED

    async def test_is_idempotent_for_an_already_refunded_payment(self, async_session):
        provider = CashProvider()
        payer = await create_test_user(async_session)
        payment = await create_test_payment(async_session, payer, status=PaymentStatus.REFUNDED)

        result = await provider.refund(async_session, payment.id)

        assert result.success is True
        assert result.status == PaymentStatus.REFUNDED

    async def test_rejects_a_non_cash_payment(self, async_session):
        provider = CashProvider()
        payer = await create_test_user(async_session)
        payment = await create_test_payment(async_session, payer, method=PaymentMethod.CHARGILY, status=PaymentStatus.COMPLETED)

        result = await provider.refund(async_session, payment.id)

        assert result.success is False
        assert "not recorded via cash" in (result.error or "")

    async def test_reports_failure_for_a_missing_payment(self, async_session):
        provider = CashProvider()

        result = await provider.refund(async_session, 999_999)

        assert result.success is False


class TestChargilyProviderStub:
    """Documented stub -- every method must raise until the real
    integration exists, so it's never silently mistaken for a working
    provider."""

    async def test_record_payment_raises(self, async_session):
        provider = ChargilyProvider()
        with pytest.raises(NotImplementedError):
            await provider.record_payment(async_session, payer_id=1, amount=Decimal("10.00"))

    async def test_get_status_raises(self, async_session):
        provider = ChargilyProvider()
        with pytest.raises(NotImplementedError):
            await provider.get_status(async_session, 1)

    async def test_refund_raises(self, async_session):
        provider = ChargilyProvider()
        with pytest.raises(NotImplementedError):
            await provider.refund(async_session, 1)
