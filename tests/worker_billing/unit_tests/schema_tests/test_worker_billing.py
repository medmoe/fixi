"""Schema tests for WorkerBilling -- does Pydantic validate the data
correctly? (field rules, defaults, security, ORM mode, is_overdue)."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from pydantic import ValidationError

from src.app.models.worker_billing import WorkerBillingStatus
from src.app.schemas.worker_billing import WorkerBillingCreateInternal, WorkerBillingRead, WorkerBillingUpdateInternal


def valid_payload(**overrides) -> dict:
    defaults = {
        "worker_profile_id": 1,
        "job_id": 1,
        "amount_owed": Decimal("5.00"),
        "due_date": datetime.now(UTC) + timedelta(days=14),
    }
    return {**defaults, **overrides}


class TestWorkerBillingCreateInternal:
    def test_valid(self):
        schema = WorkerBillingCreateInternal(**valid_payload())
        assert schema.worker_profile_id == 1
        assert schema.job_id == 1
        assert schema.amount_owed == Decimal("5.00")

    def test_amount_paid_defaults_to_zero(self):
        schema = WorkerBillingCreateInternal(**valid_payload())
        assert schema.amount_paid == Decimal("0.00")

    def test_status_defaults_to_pending(self):
        schema = WorkerBillingCreateInternal(**valid_payload())
        assert schema.status == WorkerBillingStatus.PENDING

    def test_payment_id_defaults_to_none(self):
        schema = WorkerBillingCreateInternal(**valid_payload())
        assert schema.payment_id is None

    def test_worker_profile_id_required(self):
        payload = valid_payload()
        del payload["worker_profile_id"]
        with pytest.raises(ValidationError):
            WorkerBillingCreateInternal(**payload)

    def test_job_id_required(self):
        payload = valid_payload()
        del payload["job_id"]
        with pytest.raises(ValidationError):
            WorkerBillingCreateInternal(**payload)

    def test_amount_owed_required(self):
        payload = valid_payload()
        del payload["amount_owed"]
        with pytest.raises(ValidationError):
            WorkerBillingCreateInternal(**payload)

    def test_due_date_required(self):
        payload = valid_payload()
        del payload["due_date"]
        with pytest.raises(ValidationError):
            WorkerBillingCreateInternal(**payload)

    def test_rejects_an_unknown_status(self):
        payload = valid_payload()
        payload["status"] = "cancelled"
        with pytest.raises(ValidationError):
            WorkerBillingCreateInternal(**payload)

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            WorkerBillingCreateInternal(**valid_payload(unexpected="value"))


class TestWorkerBillingUpdateInternal:
    def test_valid(self):
        schema = WorkerBillingUpdateInternal(status=WorkerBillingStatus.PAID)
        assert schema.status == WorkerBillingStatus.PAID

    def test_all_fields_optional(self):
        schema = WorkerBillingUpdateInternal()
        assert schema.amount_paid is None
        assert schema.status is None
        assert schema.payment_id is None

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            WorkerBillingUpdateInternal(unexpected="value")  # type: ignore[call-arg]


class TestWorkerBillingRead:
    def read_payload(self, **overrides) -> dict:
        defaults = {
            **valid_payload(),
            "id": 1,
            "created_at": datetime.now(UTC),
        }
        return {**defaults, **overrides}

    def test_valid_from_dict(self):
        schema = WorkerBillingRead(**self.read_payload())
        assert schema.id == 1
        assert schema.worker_profile_id == 1

    def test_id_required(self):
        payload = self.read_payload()
        del payload["id"]
        with pytest.raises(ValidationError):
            WorkerBillingRead(**payload)

    def test_from_orm_object(self):
        class FakeWorkerBilling:
            id = 1
            worker_profile_id = 1
            job_id = 1
            amount_owed = Decimal("5.00")
            due_date = datetime.now(UTC) + timedelta(days=14)
            amount_paid = Decimal("0.00")
            status = WorkerBillingStatus.PENDING
            payment_id = None
            created_at = datetime.now(UTC)
            updated_at = None

        schema = WorkerBillingRead.model_validate(FakeWorkerBilling())
        assert schema.id == 1
        assert schema.status == WorkerBillingStatus.PENDING

    def test_is_overdue_true_when_pending_and_past_due(self):
        schema = WorkerBillingRead(**self.read_payload(
            status=WorkerBillingStatus.PENDING, due_date=datetime.now(UTC) - timedelta(days=1),
        ))
        assert schema.is_overdue is True

    def test_is_overdue_false_when_pending_and_not_yet_due(self):
        schema = WorkerBillingRead(**self.read_payload(
            status=WorkerBillingStatus.PENDING, due_date=datetime.now(UTC) + timedelta(days=1),
        ))
        assert schema.is_overdue is False

    def test_is_overdue_false_when_paid_even_if_past_due(self):
        schema = WorkerBillingRead(**self.read_payload(
            status=WorkerBillingStatus.PAID, due_date=datetime.now(UTC) - timedelta(days=1),
        ))
        assert schema.is_overdue is False

    def test_is_overdue_false_when_already_marked_overdue(self):
        # OVERDUE is never auto-written today, but is_overdue is only ever
        # derived for PENDING rows -- see WorkerBillingStatus.OVERDUE's docstring.
        schema = WorkerBillingRead(**self.read_payload(
            status=WorkerBillingStatus.OVERDUE, due_date=datetime.now(UTC) - timedelta(days=1),
        ))
        assert schema.is_overdue is False
