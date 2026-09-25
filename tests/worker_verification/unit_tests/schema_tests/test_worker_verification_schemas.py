"""Schema tests for the CNI verification queue schemas."""

import pytest
from pydantic import ValidationError

from src.app.schemas.worker_profile import WorkerVerificationQueueRead, WorkerVerificationRejectRequest


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
