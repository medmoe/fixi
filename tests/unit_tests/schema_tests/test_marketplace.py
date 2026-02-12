import pytest
from pydantic import ValidationError

from src.app.schemas.job import JobAssign, JobCreate, JobStatusUpdate
from src.app.schemas.review import ReviewCreate
from src.app.schemas.service_category import ServiceCategoryCreate


class TestMarketplaceSchemas:
    def test_service_category_create_valid(self):
        payload = ServiceCategoryCreate(name="Plumbing", description="Pipe installation and repairs")
        assert payload.name == "Plumbing"

    def test_job_create_valid(self):
        payload = JobCreate(
            service_category_id=1,
            worker_id=2,
            title="Fix leaking sink",
            description="Kitchen sink leaking from the P-trap.",
        )
        assert payload.worker_id == 2

    def test_job_assign_requires_worker_id(self):
        with pytest.raises(ValidationError):
            JobAssign()

    def test_job_status_update_valid(self):
        payload = JobStatusUpdate(status="in_progress")
        assert payload.status.value == "in_progress"

    def test_review_create_rating_bounds(self):
        ReviewCreate(rating=1, comment="ok")
        ReviewCreate(rating=5, comment="great")
        with pytest.raises(ValidationError):
            ReviewCreate(rating=0, comment="bad")
        with pytest.raises(ValidationError):
            ReviewCreate(rating=6, comment="bad")
