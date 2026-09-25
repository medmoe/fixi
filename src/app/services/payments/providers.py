from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from ...crud.crud_payments import crud_payments
from ...models.payment import PaymentMethod, PaymentStatus
from ...schemas.payment import PaymentCreateInternal, PaymentRead, PaymentUpdateInternal


@dataclass(frozen=True, slots=True)
class PaymentResult:
    success: bool
    provider: str
    payment_id: int | None = None
    status: PaymentStatus | None = None
    error: str | None = None


class PaymentProvider(ABC):
    """Shared shape every payment provider implements -- callers only ever
    depend on this interface, never on a concrete provider (mirrors
    NotificationProvider from Phase 6's notification abstraction)."""

    name: str

    @abstractmethod
    async def record_payment(
        self,
        db: AsyncSession,
        *,
        payer_id: int,
        amount: Decimal,
        payee_id: int | None = None,
        job_id: int | None = None,
        subscription_id: int | None = None,
        recorded_by: int | None = None,
    ) -> PaymentResult:
        """Records a payment. `job_id`/`subscription_id` are mutually
        exclusive -- a payment is for one job or one subscription, never
        both. `payee_id=None` means the platform itself (e.g. a worker's
        commission payment has no User recipient)."""

    @abstractmethod
    async def get_status(self, db: AsyncSession, payment_id: int) -> PaymentResult:
        """Looks up a payment's current status."""

    @abstractmethod
    async def refund(self, db: AsyncSession, payment_id: int) -> PaymentResult:
        """Reverses a completed payment."""


class CashProvider(PaymentProvider):
    """No external call for any method -- cash changes hands out of band
    (in person), so this provider is purely a ledger: it validates and
    writes the `payments` row directly. `refund()` is a no-op in the sense
    that there's nothing to call out to reverse; it just flips the row's
    status, on the assumption the cash itself was already handed back
    outside this system."""

    name = "cash"

    async def record_payment(
        self,
        db: AsyncSession,
        *,
        payer_id: int,
        amount: Decimal,
        payee_id: int | None = None,
        job_id: int | None = None,
        subscription_id: int | None = None,
        recorded_by: int | None = None,
    ) -> PaymentResult:
        if amount <= 0:
            return PaymentResult(success=False, provider=self.name, error="Amount must be positive")
        if job_id is not None and subscription_id is not None:
            return PaymentResult(success=False, provider=self.name, error="A payment can reference a job or a subscription, not both")

        payment = await crud_payments.create(
            db=db,
            object=PaymentCreateInternal(
                payer_id=payer_id,
                amount=amount,
                method=PaymentMethod.CASH,
                job_id=job_id,
                subscription_id=subscription_id,
                payee_id=payee_id,
                recorded_by=recorded_by,
                # Cash is received on the spot -- there's no pending
                # intermediate state the way a gateway redirect would have.
                status=PaymentStatus.COMPLETED,
            ),
            schema_to_select=PaymentRead,
            return_as_model=True,
        )
        return PaymentResult(success=True, provider=self.name, payment_id=payment.id, status=payment.status)

    async def get_status(self, db: AsyncSession, payment_id: int) -> PaymentResult:
        payment = await crud_payments.get(db=db, id=payment_id, schema_to_select=PaymentRead, return_as_model=True)
        if payment is None:
            return PaymentResult(success=False, provider=self.name, error=f"No such payment: {payment_id}")
        return PaymentResult(success=True, provider=self.name, payment_id=payment.id, status=payment.status)

    async def refund(self, db: AsyncSession, payment_id: int) -> PaymentResult:
        payment = await crud_payments.get(db=db, id=payment_id, schema_to_select=PaymentRead, return_as_model=True)
        if payment is None:
            return PaymentResult(success=False, provider=self.name, error=f"No such payment: {payment_id}")
        if payment.method != PaymentMethod.CASH:
            return PaymentResult(
                success=False, provider=self.name, payment_id=payment.id, status=payment.status,
                error=f"Payment {payment_id} was not recorded via cash",
            )
        if payment.status == PaymentStatus.REFUNDED:
            return PaymentResult(success=True, provider=self.name, payment_id=payment.id, status=payment.status)

        await crud_payments.update(db=db, object=PaymentUpdateInternal(status=PaymentStatus.REFUNDED), id=payment_id)
        return PaymentResult(success=True, provider=self.name, payment_id=payment.id, status=PaymentStatus.REFUNDED)


class ChargilyProvider(PaymentProvider):
    """Documented stub -- conforms to PaymentProvider so `PAYMENT_PROVIDER=
    chargily` is a valid, discoverable config value now, but every method
    raises until the real integration (CIB + Edahabia checkout) is built.
    Deferred deliberately -- see documentation/PHASE_8_PAYMENTS_ADMIN_ISSUES.md,
    Issue 1's "Deferred" note."""

    name = "chargily"

    async def record_payment(
        self,
        db: AsyncSession,
        *,
        payer_id: int,
        amount: Decimal,
        payee_id: int | None = None,
        job_id: int | None = None,
        subscription_id: int | None = None,
        recorded_by: int | None = None,
    ) -> PaymentResult:
        raise NotImplementedError("Chargily integration is not implemented yet")

    async def get_status(self, db: AsyncSession, payment_id: int) -> PaymentResult:
        raise NotImplementedError("Chargily integration is not implemented yet")

    async def refund(self, db: AsyncSession, payment_id: int) -> PaymentResult:
        raise NotImplementedError("Chargily integration is not implemented yet")
