from __future__ import annotations

from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from .providers import CashProvider, ChargilyProvider, PaymentProvider, PaymentResult


def _resolve_payment_provider() -> PaymentProvider:
    name = settings.PAYMENT_PROVIDER
    if name == "cash":
        return CashProvider()
    if name == "chargily":
        return ChargilyProvider()
    raise ValueError(f"Unknown payment provider: {name!r}")


class PaymentService:
    """Central seam every payment goes through (mirrors NotificationService
    from Phase 6). Resolves the active provider from PAYMENT_PROVIDER --
    config-driven, never a hardcoded import -- so calling code never
    touches CashProvider/ChargilyProvider directly. Adding a real Chargily
    integration later is a provider class + config change here, nothing
    upstream of this service.
    """

    def __init__(self, *, provider: PaymentProvider | None = None) -> None:
        # Only resolved eagerly when a provider is passed explicitly (e.g. a
        # fake provider in tests) -- otherwise resolved lazily from config
        # the first time this service is actually used.
        self._provider = provider

    def _get_provider(self) -> PaymentProvider:
        if self._provider is None:
            self._provider = _resolve_payment_provider()
        return self._provider

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
        return await self._get_provider().record_payment(
            db,
            payer_id=payer_id,
            amount=amount,
            payee_id=payee_id,
            job_id=job_id,
            subscription_id=subscription_id,
            recorded_by=recorded_by,
        )

    async def get_status(self, db: AsyncSession, payment_id: int) -> PaymentResult:
        return await self._get_provider().get_status(db, payment_id)

    async def refund(self, db: AsyncSession, payment_id: int) -> PaymentResult:
        return await self._get_provider().refund(db, payment_id)
