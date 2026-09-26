import csv
import io
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import WorkerBillingStatus
from tests.conftest import create_test_worker_billing
from tests.job.helpers import create_test_job


class TestGetMyBilling:
    """GET /api/v1/worker-billing/me"""

    async def test_returns_the_callers_own_billing_records(
            self, async_client: AsyncClient, async_session: AsyncSession, auth_headers, test_job, test_worker_profile
    ):
        await create_test_worker_billing(async_session, test_worker_profile, test_job)

        response = await async_client.get("/api/v1/worker-billing/me", headers=auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["worker_profile_id"] == test_worker_profile.id
        assert body[0]["job_id"] == test_job.id
        assert "is_overdue" in body[0]

    async def test_does_not_return_another_workers_billing(
            self, async_client: AsyncClient, async_session: AsyncSession, worker_profile_auth_headers,
            test_job, test_worker_profile, test_other_worker_profile, customer_test_user, test_trade_category
    ):
        other_job = await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)
        await create_test_worker_billing(async_session, test_worker_profile, test_job)
        await create_test_worker_billing(async_session, test_other_worker_profile, other_job)

        response = await async_client.get("/api/v1/worker-billing/me", headers=worker_profile_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["worker_profile_id"] == test_worker_profile.id

    async def test_404_when_caller_has_no_worker_profile(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.get("/api/v1/worker-billing/me", headers=customer_auth_headers)
        assert response.status_code == 404

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/worker-billing/me")
        assert response.status_code == 401


class TestListWorkerBilling:
    """GET /api/v1/worker-billing (admin) -- filterable commission dashboard,
    Phase 8 Issue 6."""

    async def test_admin_can_list_all_records(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_job, test_worker_profile, test_user
    ):
        await create_test_worker_billing(async_session, test_worker_profile, test_job)

        response = await async_client.get("/api/v1/worker-billing", headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["worker_name"] == test_user.name
        assert body[0]["worker_email"] == test_user.email
        assert "is_overdue" in body[0]

    async def test_filters_by_status(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_job, test_worker_profile
    ):
        await create_test_worker_billing(async_session, test_worker_profile, test_job, status=WorkerBillingStatus.PAID, amount_paid=Decimal("5.00"))

        response = await async_client.get("/api/v1/worker-billing", headers=admin_auth_headers, params={"status": "paid"})

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["status"] == "paid"

    async def test_filters_by_due_date_range(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            test_job, test_worker_profile, test_other_worker_profile, customer_test_user, test_trade_category
    ):
        other_job = await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)
        await create_test_worker_billing(async_session, test_worker_profile, test_job, due_date=datetime.now(UTC) + timedelta(days=5))
        await create_test_worker_billing(async_session, test_other_worker_profile, other_job, due_date=datetime.now(UTC) + timedelta(days=30))

        response = await async_client.get(
            "/api/v1/worker-billing", headers=admin_auth_headers,
            params={"due_date_from": datetime.now(UTC).isoformat(), "due_date_to": (datetime.now(UTC) + timedelta(days=10)).isoformat()},
        )

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["worker_profile_id"] == test_worker_profile.id

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.get("/api/v1/worker-billing", headers=auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/worker-billing")
        assert response.status_code == 401


class TestExportWorkerBilling:
    """GET /api/v1/worker-billing/export -- CSV export must match the same
    filters as the list endpoint, per Issue 6's acceptance criteria."""

    async def test_admin_can_export_csv(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_job, test_worker_profile, test_user
    ):
        await create_test_worker_billing(async_session, test_worker_profile, test_job, amount_owed=Decimal("5.00"))

        response = await async_client.get("/api/v1/worker-billing/export", headers=admin_auth_headers)

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")
        rows = list(csv.DictReader(io.StringIO(response.text)))
        assert len(rows) == 1
        assert rows[0]["worker_email"] == test_user.email
        assert Decimal(rows[0]["amount_owed"]) == Decimal("5.00")

    async def test_export_matches_list_endpoint_for_the_same_filters(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_job, test_worker_profile
    ):
        await create_test_worker_billing(async_session, test_worker_profile, test_job, status=WorkerBillingStatus.PAID, amount_paid=Decimal("5.00"))

        list_response = await async_client.get("/api/v1/worker-billing", headers=admin_auth_headers, params={"status": "paid"})
        export_response = await async_client.get("/api/v1/worker-billing/export", headers=admin_auth_headers, params={"status": "paid"})

        list_body = list_response.json()
        export_rows = list(csv.DictReader(io.StringIO(export_response.text)))
        assert len(export_rows) == len(list_body)
        assert export_rows[0]["id"] == str(list_body[0]["id"])

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.get("/api/v1/worker-billing/export", headers=auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/worker-billing/export")
        assert response.status_code == 401


class TestMarkPaid:
    """PATCH /api/v1/worker-billing/{worker_billing_id}/mark-paid"""

    async def test_admin_marks_a_record_paid(
            self, async_client: AsyncClient, async_session: AsyncSession, monkeypatch,
            admin_auth_headers, test_job, test_worker_profile
    ):
        monkeypatch.setattr("src.app.services.payments.service.settings.PAYMENT_PROVIDER", "cash")
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job, amount_owed=Decimal("5.00"))

        response = await async_client.patch(f"/api/v1/worker-billing/{billing.id}/mark-paid", headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == WorkerBillingStatus.PAID.value
        assert Decimal(body["amount_paid"]) == Decimal("5.00")
        assert body["payment_id"] is not None

    async def test_non_admin_forbidden(
            self, async_client: AsyncClient, async_session: AsyncSession, auth_headers, test_job, test_worker_profile
    ):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)

        response = await async_client.patch(f"/api/v1/worker-billing/{billing.id}/mark-paid", headers=auth_headers)

        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, async_session: AsyncSession, test_job, test_worker_profile):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)

        response = await async_client.patch(f"/api/v1/worker-billing/{billing.id}/mark-paid")

        assert response.status_code == 401

    async def test_nonexistent_record_returns_404(self, async_client: AsyncClient, admin_auth_headers):
        response = await async_client.patch("/api/v1/worker-billing/999999/mark-paid", headers=admin_auth_headers)
        assert response.status_code == 404

    async def test_already_paid_returns_400(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_job, test_worker_profile
    ):
        billing = await create_test_worker_billing(
            async_session, test_worker_profile, test_job, status=WorkerBillingStatus.PAID, amount_paid=Decimal("5.00"),
        )

        response = await async_client.patch(f"/api/v1/worker-billing/{billing.id}/mark-paid", headers=admin_auth_headers)

        assert response.status_code == 400
