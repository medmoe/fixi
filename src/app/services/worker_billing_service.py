from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import BadRequestException, NotFoundException
from ..crud.crud_worker_billing import crud_worker_billing
from ..crud.crud_worker_profiles import crud_worker_profiles
from ..models import WorkerBillingStatus
from ..schemas.worker_billing import WorkerBillingRead, WorkerBillingUpdateInternal
from ..schemas.worker_profile import WorkerProfileRead
from .payments import PaymentService


async def mark_worker_billing_paid(db: AsyncSession, worker_billing_id: int, recorded_by: int) -> WorkerBillingRead:
    """Admin action: records the outstanding balance as a payment (through
    PaymentService, never a concrete provider directly -- see Phase 8
    Issue 1) and flips this billing record to PAID."""
    billing = await crud_worker_billing.get(
        db=db, id=worker_billing_id, schema_to_select=WorkerBillingRead, return_as_model=True
    )
    if billing is None:
        raise NotFoundException(f"Worker billing record with id {worker_billing_id} not found")
    if billing.status == WorkerBillingStatus.PAID:
        raise BadRequestException("This billing record has already been paid")

    worker_profile = await crud_worker_profiles.get(
        db=db, id=billing.worker_profile_id, schema_to_select=WorkerProfileRead, return_as_model=True
    )
    if worker_profile is None:
        raise NotFoundException(f"Worker profile with id {billing.worker_profile_id} not found")

    outstanding = billing.amount_owed - billing.amount_paid
    result = await PaymentService().record_payment(
        db,
        payer_id=worker_profile.user_id,
        amount=outstanding,
        payee_id=None,  # the platform, not a specific recipient user
        subscription_id=billing.id,
        recorded_by=recorded_by,
    )
    if not result.success:
        raise BadRequestException(result.error or "Failed to record payment")

    await crud_worker_billing.update(
        db=db,
        object=WorkerBillingUpdateInternal(
            amount_paid=billing.amount_owed,
            status=WorkerBillingStatus.PAID,
            payment_id=result.payment_id,
        ),
        id=worker_billing_id,
    )

    updated = await crud_worker_billing.get(
        db=db, id=worker_billing_id, schema_to_select=WorkerBillingRead, return_as_model=True
    )
    assert updated is not None  # just updated it above
    return updated
