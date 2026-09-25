"""Unit tests for the invoice HTML templates -- does substitution work,
and does every status have a label in both languages? Mirrors
tests/notifications' coverage of render_email_template's contract."""

import pytest

from src.app.models.worker_billing import WorkerBillingStatus
from src.app.services.invoices.templates import (
    STATUS_LABELS,
    InvoiceTemplateNotFound,
    render_invoice_html,
    render_payment_info_html,
)


def valid_variables(**overrides) -> dict:
    defaults = {
        "invoice_number": "INV-000001",
        "issue_date": "2026-09-25",
        "worker_name": "Test Worker",
        "job_title": "Fix Leaking Sink",
        "amount_owed": "5.00",
        "amount_paid": "0.00",
        "currency": "DZD",
        "due_date": "2026-10-09",
        "status_label": "Pending",
        "payment_info_html": "",
    }
    return {**defaults, **overrides}


class TestRenderInvoiceHtml:
    def test_renders_fr_template_with_all_variables_substituted(self):
        html = render_invoice_html("fr", valid_variables())

        assert "INV-000001" in html
        assert "Test Worker" in html
        assert "Fix Leaking Sink" in html
        assert "5.00 DZD" in html
        assert "$" not in html  # no leftover placeholders

    def test_renders_ar_template_with_all_variables_substituted(self):
        html = render_invoice_html("ar", valid_variables())

        assert "INV-000001" in html
        assert "Test Worker" in html
        assert 'dir="rtl"' in html
        assert "$" not in html

    def test_unknown_language_raises(self):
        with pytest.raises(InvoiceTemplateNotFound):
            render_invoice_html("en", valid_variables())

    def test_embeds_the_payment_info_block_verbatim(self):
        html = render_invoice_html("fr", valid_variables(payment_info_html='<div class="payment-info">Payée le 2026-09-25, en espèces.</div>'))

        assert "Payée le 2026-09-25, en espèces." in html


class TestRenderPaymentInfoHtml:
    def test_empty_when_no_payment_date(self):
        assert render_payment_info_html("fr", None) == ""
        assert render_payment_info_html("ar", None) == ""

    def test_includes_the_payment_date_in_french(self):
        html = render_payment_info_html("fr", "2026-09-25")
        assert "2026-09-25" in html
        assert "espèces" in html

    def test_includes_the_payment_date_in_arabic(self):
        html = render_payment_info_html("ar", "2026-09-25")
        assert "2026-09-25" in html
        assert "نقداً" in html


class TestStatusLabels:
    @pytest.mark.parametrize("status", list(WorkerBillingStatus))
    @pytest.mark.parametrize("language", ["fr", "ar"])
    def test_every_status_has_a_label_in_both_languages(self, status, language):
        assert (status, language) in STATUS_LABELS
        assert STATUS_LABELS[(status, language)]
