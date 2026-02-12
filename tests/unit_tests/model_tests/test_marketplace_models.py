import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.app.models.job import Job, JobStatus
from src.app.models.review import Review
from src.app.models.service_category import ServiceCategory
from src.app.models.user import User


class TestMarketplaceModels:
    @pytest.mark.asyncio
    async def test_create_service_job_and_review(self, async_session):
        customer = User(
            name="Customer User",
            username="customeruser",
            email="customer@example.com",
            hashed_password="hashed_password",
        )
        worker = User(
            name="Worker User",
            username="workeruser",
            email="worker@example.com",
            hashed_password="hashed_password",
        )
        async_session.add(customer)
        async_session.add(worker)
        await async_session.commit()
        await async_session.refresh(customer)
        await async_session.refresh(worker)

        category = ServiceCategory(name="Plumbing", description="Plumbing and pipe repair")
        async_session.add(category)
        await async_session.commit()
        await async_session.refresh(category)

        job = Job(
            service_category_id=category.id,
            customer_id=customer.id,
            worker_id=worker.id,
            title="Fix kitchen sink",
            description="The sink is leaking from the bottom pipe.",
            status=JobStatus.ASSIGNED,
        )
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        review = Review(
            job_id=job.id,
            rating=5,
            comment="Great service, arrived on time and fixed quickly.",
        )
        async_session.add(review)
        await async_session.commit()
        await async_session.refresh(review)

        assert category.id is not None
        assert job.id is not None
        assert job.status == JobStatus.ASSIGNED
        assert review.id is not None
        assert review.rating == 5

        result = await async_session.execute(select(Review).where(Review.job_id == job.id))
        saved_review = result.scalar_one_or_none()
        assert saved_review is not None

    @pytest.mark.asyncio
    async def test_review_rating_range_constraint(self, async_session):
        customer = User(
            name="Constraint Customer",
            username="constraintcustomer",
            email="constraint.customer@example.com",
            hashed_password="hashed_password",
        )
        worker = User(
            name="Constraint Worker",
            username="constraintworker",
            email="constraint.worker@example.com",
            hashed_password="hashed_password",
        )
        async_session.add(customer)
        async_session.add(worker)
        await async_session.commit()
        await async_session.refresh(customer)
        await async_session.refresh(worker)

        job = Job(
            customer_id=customer.id,
            worker_id=worker.id,
            title="Broken light switch",
            description="Switch sparks when turned on.",
        )
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        invalid_review = Review(job_id=job.id, rating=6, comment="Invalid rating")
        async_session.add(invalid_review)

        with pytest.raises(IntegrityError):
            await async_session.commit()
