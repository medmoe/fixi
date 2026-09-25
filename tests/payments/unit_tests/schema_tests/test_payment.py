"""Schema tests for Payment -- does Pydantic validate the data correctly?
(field rules, defaults, security, ORM mode)."""

from datetime import UTC, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from src.app.models.payment import PaymentMethod, PaymentStatus
from src.app.schemas.payment import PaymentCreateInternal, PaymentRead, PaymentUpdateInternal


def valid_payload(**overrides) -> dict:
    defaults = {
        "payer_id": 1,
        "amount": Decimal("50.00"),
        "method": PaymentMethod.CASH,
    }
    return {**defaults, **overrides}


class TestPaymentCreateInternal:
    def test_valid(self):
        schema = PaymentCreateInternal(**valid_payload())
        assert schema.payer_id == 1
        assert schema.amount == Decimal("50.00")
        assert schema.method == PaymentMethod.CASH

    def test_optional_fields_default_to_none(self):
        schema = PaymentCreateInternal(**valid_payload())
        assert schema.job_id is None
        assert schema.subscription_id is None
        assert schema.payee_id is None
        assert schema.recorded_by is None

    def test_status_defaults_to_pending(self):
        schema = PaymentCreateInternal(**valid_payload())
        assert schema.status == PaymentStatus.PENDING

    def test_accepts_an_explicit_status(self):
        schema = PaymentCreateInternal(**valid_payload(status=PaymentStatus.COMPLETED))
        assert schema.status == PaymentStatus.COMPLETED

    def test_payer_id_required(self):
        payload = valid_payload()
        del payload["payer_id"]
        with pytest.raises(ValidationError):
            PaymentCreateInternal(**payload)

    def test_amount_required(self):
        payload = valid_payload()
        del payload["amount"]
        with pytest.raises(ValidationError):
            PaymentCreateInternal(**payload)

    def test_method_required(self):
        payload = valid_payload()
        del payload["method"]
        with pytest.raises(ValidationError):
            PaymentCreateInternal(**payload)

    def test_rejects_an_unknown_method(self):
        payload = valid_payload()
        payload["method"] = "credit_card"
        with pytest.raises(ValidationError):
            PaymentCreateInternal(**payload)

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            PaymentCreateInternal(**valid_payload(unexpected="value"))


class TestPaymentUpdateInternal:
    def test_valid(self):
        schema = PaymentUpdateInternal(status=PaymentStatus.REFUNDED)
        assert schema.status == PaymentStatus.REFUNDED

    def test_status_required(self):
        with pytest.raises(ValidationError):
            PaymentUpdateInternal()  # type: ignore[call-arg]

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            PaymentUpdateInternal(status=PaymentStatus.REFUNDED, unexpected="value")  # type: ignore[call-arg]


class TestPaymentRead:
    def read_payload(self, **overrides) -> dict:
        defaults = {
            **valid_payload(),
            "id": 1,
            "created_at": datetime.now(UTC),
        }
        return {**defaults, **overrides}

    def test_valid_from_dict(self):
        schema = PaymentRead(**self.read_payload())
        assert schema.id == 1
        assert schema.payer_id == 1

    def test_from_orm_object(self):
        class FakePayment:
            id = 1
            payer_id = 1
            amount = Decimal("50.00")
            method = PaymentMethod.CASH
            job_id = None
            subscription_id = None
            payee_id = None
            recorded_by = None
            status = PaymentStatus.PENDING
            created_at = datetime.now(UTC)
            updated_at = None

        schema = PaymentRead.model_validate(FakePayment())
        assert schema.id == 1
        assert schema.status == PaymentStatus.PENDING

    def test_id_required(self):
        payload = self.read_payload()
        del payload["id"]
        with pytest.raises(ValidationError):
            PaymentRead(**payload)
