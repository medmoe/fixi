"""Unit tests for invoice_service.get_invoice_pdf -- access control,
generate-once-then-cache behavior, and language selection."""

from decimal import Decimal

import pytest

from src.app.core.exceptions.http_exceptions import ForbiddenException, NotFoundException
from src.app.crud.crud_worker_billing import crud_worker_billing
from src.app.models import PreferredLanguage
from src.app.schemas.worker_billing import WorkerBillingRead, WorkerBillingUpdateInternal
from src.app.services import invoice_service
from src.app.services.invoice_service import get_invoice_pdf
from tests.conftest import create_test_payment, create_test_user, create_test_worker_billing, create_test_worker_profile
from tests.job.helpers import create_test_job


async def make_billing(async_session, *, preferred_language=PreferredLanguage.FR, **billing_overrides):
    worker_user = await create_test_user(async_session, preferred_language=preferred_language)
    worker_profile = await create_test_worker_profile(async_session, worker_user)
    customer = await create_test_user(async_session)
    job = await create_test_job(async_session, customer)
    billing = await create_test_worker_billing(async_session, worker_profile, job, **billing_overrides)
    return billing, worker_profile, worker_user


class TestGetInvoicePdfAccessControl:
    async def test_raises_not_found_for_a_missing_billing_record(self, async_session, test_user):
        with pytest.raises(NotFoundException):
            await get_invoice_pdf(async_session, 999_999, {"id": test_user.id, "is_superuser": False})

    async def test_forbidden_for_a_stranger(self, async_session):
        billing, _, _ = await make_billing(async_session)
        stranger = await create_test_user(async_session)

        with pytest.raises(ForbiddenException):
            await get_invoice_pdf(async_session, billing.id, {"id": stranger.id, "is_superuser": False})

    async def test_allowed_for_the_owning_worker(self, async_session):
        billing, _, worker_user = await make_billing(async_session)

        pdf = await get_invoice_pdf(async_session, billing.id, {"id": worker_user.id, "is_superuser": False})

        assert pdf.startswith(b"%PDF")

    async def test_allowed_for_an_admin(self, async_session, test_admin_user):
        billing, _, _ = await make_billing(async_session)

        pdf = await get_invoice_pdf(async_session, billing.id, {"id": test_admin_user.id, "is_superuser": True})

        assert pdf.startswith(b"%PDF")


class TestGetInvoicePdfGenerateOnceThenCache:
    async def test_stores_the_invoice_key_on_first_request(self, async_session):
        billing, _, worker_user = await make_billing(async_session)

        await get_invoice_pdf(async_session, billing.id, {"id": worker_user.id, "is_superuser": False})

        updated = await crud_worker_billing.get(db=async_session, id=billing.id, schema_to_select=WorkerBillingRead, return_as_model=True)
        assert updated.invoice_key is not None

    async def test_does_not_regenerate_on_a_second_request(self, async_session, monkeypatch):
        billing, _, worker_user = await make_billing(async_session)
        requester = {"id": worker_user.id, "is_superuser": False}

        call_count = 0
        original = invoice_service.html_to_pdf

        def counting_html_to_pdf(html):
            nonlocal call_count
            call_count += 1
            return original(html)

        monkeypatch.setattr(invoice_service, "html_to_pdf", counting_html_to_pdf)

        first = await get_invoice_pdf(async_session, billing.id, requester)
        second = await get_invoice_pdf(async_session, billing.id, requester)

        assert call_count == 1
        assert first == second


class TestGetInvoicePdfLanguageSelection:
    async def test_uses_the_arabic_template_for_arabic_preferred_language(self, async_session, monkeypatch):
        billing, _, worker_user = await make_billing(async_session, preferred_language=PreferredLanguage.AR)
        captured = {}
        original = invoice_service.render_invoice_html

        def spy(language, variables):
            captured["language"] = language
            return original(language, variables)

        monkeypatch.setattr(invoice_service, "render_invoice_html", spy)

        await get_invoice_pdf(async_session, billing.id, {"id": worker_user.id, "is_superuser": False})

        assert captured["language"] == "ar"

    async def test_falls_back_to_french_for_a_non_arabic_preferred_language(self, async_session, monkeypatch):
        billing, _, worker_user = await make_billing(async_session, preferred_language=PreferredLanguage.EN)
        captured = {}
        original = invoice_service.render_invoice_html

        def spy(language, variables):
            captured["language"] = language
            return original(language, variables)

        monkeypatch.setattr(invoice_service, "render_invoice_html", spy)

        await get_invoice_pdf(async_session, billing.id, {"id": worker_user.id, "is_superuser": False})

        assert captured["language"] == "fr"


class TestGetInvoicePdfPaymentInfo:
    async def test_payment_info_included_when_paid(self, async_session, monkeypatch):
        billing, _, worker_user = await make_billing(async_session)
        payment = await create_test_payment(async_session, worker_user, amount=Decimal("5.00"))
        await crud_worker_billing.update(
            db=async_session, id=billing.id,
            object=WorkerBillingUpdateInternal(payment_id=payment.id),
        )

        captured = {}
        original = invoice_service.render_invoice_html

        def spy(language, variables):
            captured["payment_info_html"] = variables["payment_info_html"]
            return original(language, variables)

        monkeypatch.setattr(invoice_service, "render_invoice_html", spy)

        await get_invoice_pdf(async_session, billing.id, {"id": worker_user.id, "is_superuser": False})

        assert captured["payment_info_html"] != ""

    async def test_payment_info_empty_when_unpaid(self, async_session, monkeypatch):
        billing, _, worker_user = await make_billing(async_session)

        captured = {}
        original = invoice_service.render_invoice_html

        def spy(language, variables):
            captured["payment_info_html"] = variables["payment_info_html"]
            return original(language, variables)

        monkeypatch.setattr(invoice_service, "render_invoice_html", spy)

        await get_invoice_pdf(async_session, billing.id, {"id": worker_user.id, "is_superuser": False})

        assert captured["payment_info_html"] == ""
