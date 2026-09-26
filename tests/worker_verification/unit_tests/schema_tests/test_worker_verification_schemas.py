"""Schema tests for the CNI verification queue schemas."""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from src.app.schemas.worker_profile import WorkerProfileRead, WorkerVerificationQueueRead, WorkerVerificationRejectRequest


class TestWorkerVerificationQueueRead:
    def test_valid(self):
        schema = WorkerVerificationQueueRead(id=1, user_id=2, name="Ali", email="ali@example.com", bio="Plumber", years_of_experience=5)
        assert schema.id == 1
        assert schema.user_id == 2
        assert schema.name == "Ali"
        assert schema.email == "ali@example.com"

    def test_bio_and_years_of_experience_optional(self):
        schema = WorkerVerificationQueueRead(id=1, user_id=2, name="Ali", email="ali@example.com")
        assert schema.bio is None
        assert schema.years_of_experience is None

    def test_never_exposes_a_cni_document_key_field(self):
        # the raw S3 key must never appear on this schema -- only fetched
        # through the separate signed document-url endpoint.
        assert "cni_document_key" not in WorkerVerificationQueueRead.model_fields

    def test_from_orm_like_object(self):
        class FakeRow:
            id = 1
            user_id = 2
            name = "Ali"
            email = "ali@example.com"
            bio = None
            years_of_experience = None

        schema = WorkerVerificationQueueRead.model_validate(FakeRow())
        assert schema.id == 1


class TestWorkerProfileReadHasCniDocument:
    def read_payload(self, **overrides) -> dict:
        defaults = {
            "id": 1, "user_id": 2, "is_verified": False, "is_available": True,
            "bio": None, "years_of_experience": None, "hourly_rate": Decimal("50.00"),
            "service_radius_km": None, "avatar_url": None, "cni_document_key": None,
        }
        return {**defaults, **overrides}

    def test_false_when_no_document_uploaded(self):
        schema = WorkerProfileRead(**self.read_payload())
        assert schema.has_cni_document is False

    def test_true_when_a_document_is_uploaded(self):
        schema = WorkerProfileRead(**self.read_payload(cni_document_key="cni/1.pdf"))
        assert schema.has_cni_document is True

    def test_cni_document_key_never_appears_in_serialized_output(self):
        schema = WorkerProfileRead(**self.read_payload(cni_document_key="cni/1.pdf"))
        dumped = schema.model_dump()
        assert "cni_document_key" not in dumped
        assert dumped["has_cni_document"] is True


class TestWorkerVerificationRejectRequest:
    def test_valid(self):
        schema = WorkerVerificationRejectRequest(reason="Document is blurry")
        assert schema.reason == "Document is blurry"

    def test_reason_required(self):
        with pytest.raises(ValidationError):
            WorkerVerificationRejectRequest()  # type: ignore[call-arg]

    def test_reason_cannot_be_empty(self):
        with pytest.raises(ValidationError):
            WorkerVerificationRejectRequest(reason="")

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            WorkerVerificationRejectRequest(reason="ok", unexpected="value")  # type: ignore[call-arg]
