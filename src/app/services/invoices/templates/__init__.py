from pathlib import Path
from string import Template

from ....models.worker_billing import WorkerBillingStatus

TEMPLATES_DIR = Path(__file__).parent

STATUS_LABELS: dict[tuple[WorkerBillingStatus, str], str] = {
    (WorkerBillingStatus.PENDING, "fr"): "En attente",
    (WorkerBillingStatus.PAID, "fr"): "Payée",
    (WorkerBillingStatus.OVERDUE, "fr"): "En retard",
    (WorkerBillingStatus.PENDING, "ar"): "قيد الانتظار",
    (WorkerBillingStatus.PAID, "ar"): "مدفوعة",
    (WorkerBillingStatus.OVERDUE, "ar"): "متأخرة",
}

_PAYMENT_INFO_TEMPLATES: dict[str, str] = {
    "fr": '<div class="payment-info">Payée le $payment_date, en espèces.</div>',
    "ar": '<div class="payment-info">دُفعت بتاريخ $payment_date نقداً.</div>',
}


class InvoiceTemplateNotFound(Exception):
    pass


def render_payment_info_html(language: str, payment_date: str | None) -> str:
    """A small conditional block substituted into the invoice's
    $payment_info_html placeholder -- string.Template has no conditionals,
    so branching happens here in Python instead. Empty when nothing has
    been paid yet, so an unpaid invoice shows no payment claim at all."""
    if payment_date is None:
        return ""
    return Template(_PAYMENT_INFO_TEMPLATES[language]).safe_substitute(payment_date=payment_date)


def render_invoice_html(language: str, variables: dict[str, str]) -> str:
    """Renders `invoice_{language}.html`, substituting `$variable`
    placeholders -- mirrors services/notifications/email_templates'
    render_email_template, minus the subject line invoices don't need."""
    path = TEMPLATES_DIR / f"invoice_{language}.html"
    try:
        raw_html = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise InvoiceTemplateNotFound(f"No invoice template for language {language!r}") from exc

    return Template(raw_html).safe_substitute(variables)
