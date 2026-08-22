import pytest
from pydantic import ValidationError

from src.app.models import ApplicationStatus
from src.app.schemas.job_application import (
    JobApplicationCreate,
    JobApplicationCreateInternal,
    JobApplicationUpdate,
    JobApplicationUpdateInternal,
    JobApplicationRead,
    JobApplicationDelete,
)


class TestJobApplicationCreate:

    def test_valid_create_with_message(self):
        schema = JobApplicationCreate(message="I have 5 years of experience")
        assert schema.message == "I have 5 years of experience"

    def test_valid_create_without_message(self):
        schema = JobApplicationCreate()
        assert schema.message is None

    def test_message_max_length_enforced(self):
        with pytest.raises(ValidationError):
            JobApplicationCreate(message="a" * 1001)

    def test_message_at_exact_max_length_is_valid(self):
        schema = JobApplicationCreate(message="a" * 1000)
        assert len(schema.message) == 1000

    def test_status_field_does_not_exist_on_create(self):
        """Critical: a worker must never be able to self-set application status."""
        with pytest.raises(ValidationError):
            JobApplicationCreate(status="accepted")  # type: ignore[call-arg]

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            JobApplicationCreate(unexpected_field="value")  # type: ignore[call-arg]


class TestJobApplicationCreateInternal:

    def test_valid_internal_create(self):
        schema = JobApplicationCreateInternal(job_id=1, worker_profile_id=2, message="hello")
        assert schema.job_id == 1
        assert schema.worker_profile_id == 2
        assert schema.status == ApplicationStatus.PENDING

    def test_status_defaults_to_pending(self):
        schema = JobApplicationCreateInternal(job_id=1, worker_profile_id=2)
        assert schema.status == ApplicationStatus.PENDING

    def test_job_id_must_be_positive(self):
        with pytest.raises(ValidationError):
            JobApplicationCreateInternal(job_id=0, worker_profile_id=2)

    def test_worker_profile_id_must_be_positive(self):
        with pytest.raises(ValidationError):
            JobApplicationCreateInternal(job_id=1, worker_profile_id=0)

    def test_negative_job_id_rejected(self):
        with pytest.raises(ValidationError):
            JobApplicationCreateInternal(job_id=-1, worker_profile_id=2)


class TestJobApplicationUpdate:

    def test_valid_update(self):
        schema = JobApplicationUpdate(status=ApplicationStatus.ACCEPTED)
        assert schema.status == ApplicationStatus.ACCEPTED

    def test_status_is_required(self):
        with pytest.raises(ValidationError):
            JobApplicationUpdate()  # type: ignore[call-arg]

    def test_invalid_status_value_rejected(self):
        with pytest.raises(ValidationError):
            JobApplicationUpdate(status="not_a_real_status")  # type: ignore[arg-type]

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            JobApplicationUpdate(status=ApplicationStatus.REJECTED, message="not allowed here")  # type: ignore[call-arg]

    def test_message_cannot_be_set_via_update(self):
        """Only status transitions are allowed through this schema — an
        applicant's message must not be editable by the job owner."""
        with pytest.raises(ValidationError):
            JobApplicationUpdate(status=ApplicationStatus.ACCEPTED, message="edited")  # type: ignore[call-arg]


class TestJobApplicationUpdateInternal:

    def test_valid_internal_update(self):
        schema = JobApplicationUpdateInternal(status=ApplicationStatus.REJECTED)
        assert schema.status == ApplicationStatus.REJECTED

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            JobApplicationUpdateInternal(status=ApplicationStatus.PENDING, job_id=1)  # type: ignore[call-arg]


class TestJobApplicationDelete:

    def test_valid_delete(self):
        schema = JobApplicationDelete(id=5)
        assert schema.id == 5

    def test_id_must_be_positive(self):
        with pytest.raises(ValidationError):
            JobApplicationDelete(id=0)


class TestJobApplicationRead:

    def test_valid_read_with_minimal_fields(self):
        schema = JobApplicationRead(id=1, status=ApplicationStatus.PENDING, message=None)
        assert schema.id == 1
        assert schema.job is None
        assert schema.worker_profile is None

    def test_status_is_required_on_read(self):
        with pytest.raises(ValidationError):
            JobApplicationRead(id=1, message=None)  # type: ignore[call-arg]
