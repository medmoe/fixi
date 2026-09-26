import csv
import io
from datetime import UTC, datetime

from sqlalchemy import ColumnElement, and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import BadRequestException, NotFoundException
from ..crud.crud_worker_billing import crud_worker_billing
from ..crud.crud_worker_profiles import crud_worker_profiles
from ..models import User, WorkerBilling, WorkerBillingStatus, WorkerProfile
from ..schemas.worker_billing import (
    WorkerBillingAdminFilter,
    WorkerBillingAdminRead,
    WorkerBillingDisplayStatus,
    WorkerBillingRead,
    WorkerBillingUpdateInternal,
)
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


#
# -------------------------------------------------------------------------
# Admin dashboard (Phase 8 Issue 6)
# -------------------------------------------------------------------------
#

def _build_admin_filter_clauses(filters: WorkerBillingAdminFilter) -> list[ColumnElement[bool]]:
    """Shared between the list endpoint and the CSV export -- the same
    clauses drive both, so the export can never disagree with the screen."""
    clauses: list[ColumnElement[bool]] = []

    if filters.worker_profile_id is not None:
        clauses.append(WorkerBilling.worker_profile_id == filters.worker_profile_id)

    if filters.status is not None:
        now = datetime.now(UTC)
        if filters.status == WorkerBillingDisplayStatus.paid:
            clauses.append(WorkerBilling.status == WorkerBillingStatus.PAID)
        elif filters.status == WorkerBillingDisplayStatus.overdue:
            clauses.append(and_(WorkerBilling.status == WorkerBillingStatus.PENDING, WorkerBilling.due_date < now))
        else:  # pending
            clauses.append(and_(WorkerBilling.status == WorkerBillingStatus.PENDING, WorkerBilling.due_date >= now))

    if filters.due_date_from is not None:
        clauses.append(WorkerBilling.due_date >= filters.due_date_from)
    if filters.due_date_to is not None:
        clauses.append(WorkerBilling.due_date <= filters.due_date_to)

    return clauses


async def list_worker_billing_admin(db: AsyncSession, filters: WorkerBillingAdminFilter) -> list[WorkerBillingAdminRead]:
    """Filterable, exportable admin commission dashboard -- joins in the
    worker's name/email so the table is usable on its own (see
    WorkerBillingAdminRead's docstring)."""
    stmt = (
        select(
            WorkerBilling.id,
            WorkerBilling.worker_profile_id,
            User.name.label("worker_name"),
            User.email.label("worker_email"),
            WorkerBilling.job_id,
            WorkerBilling.amount_owed,
            WorkerBilling.amount_paid,
            WorkerBilling.due_date,
            WorkerBilling.status,
            WorkerBilling.payment_id,
            WorkerBilling.created_at,
        )
        .join(WorkerProfile, WorkerProfile.id == WorkerBilling.worker_profile_id)
        .join(User, User.id == WorkerProfile.user_id)
        .where(*_build_admin_filter_clauses(filters))
        .order_by(WorkerBilling.due_date.desc())
    )
    result = await db.execute(stmt)
    return [WorkerBillingAdminRead.model_validate(row) for row in result.all()]


async def export_worker_billing_csv(db: AsyncSession, filters: WorkerBillingAdminFilter) -> str:
    """Builds the CSV from the exact same rows list_worker_billing_admin
    returns, guaranteeing the export always matches what's on screen."""
    rows = await list_worker_billing_admin(db, filters)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "id", "worker_profile_id", "worker_name", "worker_email", "job_id",
        "amount_owed", "amount_paid", "due_date", "status", "is_overdue", "payment_id", "created_at",
    ])
    for row in rows:
        writer.writerow([
            row.id, row.worker_profile_id, row.worker_name, row.worker_email, row.job_id,
            row.amount_owed, row.amount_paid, row.due_date.isoformat(), row.status.value,
            row.is_overdue, row.payment_id if row.payment_id is not None else "", row.created_at.isoformat(),
        ])
    return buffer.getvalue()
