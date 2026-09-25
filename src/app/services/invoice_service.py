import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.exceptions.http_exceptions import ForbiddenException, NotFoundException
from ..crud.crud_payments import crud_payments
from ..crud.crud_worker_billing import crud_worker_billing
from ..crud.crud_worker_profiles import crud_worker_profiles
from ..models import Job, PreferredLanguage, User
from ..schemas.payment import PaymentRead
from ..schemas.worker_billing import WorkerBillingRead, WorkerBillingUpdateInternal
from ..schemas.worker_profile import WorkerProfileRead
from .invoices.pdf import html_to_pdf
from .invoices.templates import STATUS_LABELS, render_invoice_html, render_payment_info_html
from .minio_client import minio_client

_INVOICE_PREFIX = "invoices"


def _invoice_language(preferred_language: PreferredLanguage) -> str:
    """Only AR + FR invoice templates exist (Issue 3's scope) -- anything
    else (EN) falls back to French, the platform's other primary language."""
    return "ar" if preferred_language == PreferredLanguage.AR else "fr"


async def _render_invoice_pdf(db: AsyncSession, billing: WorkerBillingRead, worker_user: User) -> bytes:
    job_title = await db.scalar(select(Job.title).where(Job.id == billing.job_id))

    payment_date: str | None = None
    if billing.payment_id is not None:
        payment = await crud_payments.get(db=db, id=billing.payment_id, schema_to_select=PaymentRead, return_as_model=True)
        if payment is not None:
            payment_date = payment.created_at.strftime("%Y-%m-%d")

    language = _invoice_language(worker_user.preferred_language)
    variables = {
        "invoice_number": f"INV-{billing.id:06d}",
        "issue_date": billing.created_at.strftime("%Y-%m-%d"),
        "worker_name": worker_user.name,
        "job_title": job_title or "",
        "amount_owed": f"{billing.amount_owed:.2f}",
        "amount_paid": f"{billing.amount_paid:.2f}",
        "currency": settings.INVOICE_CURRENCY_CODE,
        "due_date": billing.due_date.strftime("%Y-%m-%d"),
        "status_label": STATUS_LABELS[(billing.status, language)],
        "payment_info_html": render_payment_info_html(language, payment_date),
    }
    html = render_invoice_html(language, variables)
    return html_to_pdf(html)


async def get_invoice_pdf(db: AsyncSession, worker_billing_id: int, requesting_user: dict) -> bytes:
    """Returns this billing row's invoice PDF -- generated and stored on
    the first request, served straight from storage on every one after
    (Issue 3: "retrievable at any time... not just at generation time").
    Accessible to the worker it belongs to, or an admin."""
    billing = await crud_worker_billing.get(db=db, id=worker_billing_id, schema_to_select=WorkerBillingRead, return_as_model=True)
    if billing is None:
        raise NotFoundException(f"Worker billing record with id {worker_billing_id} not found")

    worker_profile = await crud_worker_profiles.get(db=db, id=billing.worker_profile_id, schema_to_select=WorkerProfileRead, return_as_model=True)
    if worker_profile is None:
        raise NotFoundException(f"Worker profile with id {billing.worker_profile_id} not found")

    is_owner = requesting_user["id"] == worker_profile.user_id
    is_admin = bool(requesting_user.get("is_superuser"))
    if not is_owner and not is_admin:
        raise ForbiddenException("You cannot access this invoice")

    if billing.invoice_key is not None:
        return minio_client.download_file(bucket=minio_client.bucket_uploads, key=billing.invoice_key)

    worker_user = await db.get(User, worker_profile.user_id)
    assert worker_user is not None  # the FK worker_profiles.user_id guarantees this
    pdf_bytes = await _render_invoice_pdf(db, billing, worker_user)

    key = f"{_INVOICE_PREFIX}/{uuid.uuid4().hex}.pdf"
    minio_client.upload_file(bucket=minio_client.bucket_uploads, key=key, data=pdf_bytes, content_type="application/pdf")
    await crud_worker_billing.update(db=db, object=WorkerBillingUpdateInternal(invoice_key=key), id=billing.id)

    return pdf_bytes
