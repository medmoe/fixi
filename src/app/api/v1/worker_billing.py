from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import NotFoundException
from ...crud.crud_worker_billing import crud_worker_billing
from ...crud.crud_worker_profiles import crud_worker_profiles
from ...schemas.worker_billing import WorkerBillingRead
from ...schemas.worker_profile import WorkerProfileRead
from ...services.invoice_service import get_invoice_pdf
from ...services.worker_billing_service import mark_worker_billing_paid

router = APIRouter(tags=["worker-billing"], prefix="/worker-billing")


# ─── GET /worker-billing/me ──────────────────────────────────────────────────
@router.get("/me", response_model=list[WorkerBillingRead], status_code=200)
async def get_my_billing(
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[WorkerBillingRead]:
    """The caller's own commission records -- read-only, no payment UI
    here (there's nothing to pay online yet; cash is handled by an admin)."""
    worker_profile = await crud_worker_profiles.get(
        db=db, user_id=current_user["id"], schema_to_select=WorkerProfileRead, return_as_model=True
    )
    if worker_profile is None:
        raise NotFoundException("Worker profile not found")

    result = await crud_worker_billing.get_multi(
        db=db,
        worker_profile_id=worker_profile.id,
        schema_to_select=WorkerBillingRead,
        return_as_model=True,
        limit=None,
        sort_columns="due_date",
        sort_orders="desc",
    )
    return result["data"]


# ─── GET /worker-billing ─────────────────────────────────────────────────────
@router.get("", response_model=list[WorkerBillingRead], status_code=200)
async def list_worker_billing(
        _admin: Annotated[dict, Depends(get_current_superuser)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[WorkerBillingRead]:
    """Flat, unfiltered list -- enough to see what's outstanding and act on
    it via mark-paid below. The real filterable/exportable admin dashboard
    is Phase 8 Issue 6."""
    result = await crud_worker_billing.get_multi(
        db=db,
        schema_to_select=WorkerBillingRead,
        return_as_model=True,
        limit=None,
        sort_columns="due_date",
        sort_orders="desc",
    )
    return result["data"]


# ─── PATCH /worker-billing/{id}/mark-paid ────────────────────────────────────
@router.patch("/{worker_billing_id}/mark-paid", response_model=WorkerBillingRead, status_code=200)
async def mark_paid(
        worker_billing_id: int,
        admin: Annotated[dict, Depends(get_current_superuser)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> WorkerBillingRead:
    return await mark_worker_billing_paid(db, worker_billing_id, recorded_by=admin["id"])


# ─── GET /worker-billing/{id}/invoice ────────────────────────────────────────
@router.get("/{worker_billing_id}/invoice", status_code=200)
async def download_invoice(
        worker_billing_id: int,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> Response:
    """Streams the PDF invoice for this billing row (generating it on first
    request). Accessible to the worker it belongs to, or an admin -- see
    invoice_service.get_invoice_pdf for the access check."""
    pdf_bytes = await get_invoice_pdf(db, worker_billing_id, current_user)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{worker_billing_id}.pdf"'},
    )
