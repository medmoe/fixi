"""Tests for the WorkerBilling row that mark_job_complete auto-creates once
a job reaches COMPLETED -- Phase 8 Issue 2's flat-commission-per-job hook."""

from datetime import UTC, datetime, timedelta

import pytest

from src.app.core.config import settings
from src.app.crud.crud_worker_billing import crud_worker_billing
from src.app.models import Job, JobStatus, WorkerBillingStatus, WorkerProfile
from src.app.schemas.worker_billing import WorkerBillingRead
from src.app.services.job_lifecycle_service import mark_job_complete
from tests.job.unit_tests.service_tests.test_job_lifecycle_service import accept_application


class TestWorkerBillingCreationOnCompletion:
    @pytest.mark.unit
    async def test_creates_a_billing_row_once_both_sides_confirm(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.IN_PROGRESS
        await async_session.commit()

        await mark_job_complete(async_session, job=test_job, user_id=customer_test_user.id)
        await async_session.refresh(test_job)
        await mark_job_complete(async_session, job=test_job, user_id=test_worker_profile.user_id)

        result = await crud_worker_billing.get_multi(
            db=async_session, job_id=test_job.id, schema_to_select=WorkerBillingRead, return_as_model=True,
        )
        rows = result["data"]
        assert len(rows) == 1
        billing = rows[0]
        assert billing.worker_profile_id == test_worker_profile.id
        assert billing.job_id == test_job.id
        assert billing.status == WorkerBillingStatus.PENDING
        assert billing.amount_paid == 0

    @pytest.mark.unit
    async def test_amount_and_due_date_come_from_settings(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.IN_PROGRESS
        await async_session.commit()

        before = datetime.now(UTC)
        await mark_job_complete(async_session, job=test_job, user_id=customer_test_user.id)
        await async_session.refresh(test_job)
        await mark_job_complete(async_session, job=test_job, user_id=test_worker_profile.user_id)

        result = await crud_worker_billing.get_multi(
            db=async_session, job_id=test_job.id, schema_to_select=WorkerBillingRead, return_as_model=True,
        )
        billing = result["data"][0]

        assert billing.amount_owed == settings.WORKER_COMMISSION_AMOUNT
        expected_due = before + timedelta(days=settings.WORKER_COMMISSION_DUE_DAYS)
        assert abs((billing.due_date - expected_due).total_seconds()) < 5

    @pytest.mark.unit
    async def test_no_billing_row_before_both_sides_confirm(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.IN_PROGRESS
        await async_session.commit()

        await mark_job_complete(async_session, job=test_job, user_id=customer_test_user.id)

        result = await crud_worker_billing.get_multi(
            db=async_session, job_id=test_job.id, schema_to_select=WorkerBillingRead, return_as_model=True,
        )
        assert result["data"] == []
