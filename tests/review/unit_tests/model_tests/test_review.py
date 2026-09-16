import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.app.models import Job, Review, User, UserRole, WorkerProfile


class TestReviewModel:
    """Test Review model."""

    @pytest.mark.unit
    async def test_create_review_with_all_fields(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile
    ):
        """Test creating a review with all fields explicitly set."""
        review = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            role=UserRole.CUSTOMER,
            rating=5,
            comment="Great work, showed up on time.",
            is_flagged=False,
        )
        async_session.add(review)
        await async_session.commit()
        await async_session.refresh(review)

        assert review.id is not None
        assert review.job_id == test_job.id
        assert review.reviewer_id == customer_test_user.id
        assert review.reviewee_id == test_worker_profile.user_id
        assert review.role == UserRole.CUSTOMER
        assert review.rating == 5
        assert review.comment == "Great work, showed up on time."
        assert review.is_flagged is False
        assert review.created_at is not None

    @pytest.mark.unit
    async def test_create_review_with_minimum_fields(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile
    ):
        """Test creating a review with only the required foreign keys, relying on column defaults."""
        review = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
        )
        async_session.add(review)
        await async_session.commit()
        await async_session.refresh(review)

        assert review.id is not None
        assert review.role == UserRole.CUSTOMER
        assert review.rating == 1
        assert review.comment is None
        assert review.is_flagged is False

    @pytest.mark.unit
    async def test_review_role_can_be_worker(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile
    ):
        """Test that a worker can leave a review on the customer for the same job."""
        review = Review(
            job_id=test_job.id,
            reviewer_id=test_worker_profile.user_id,
            reviewee_id=customer_test_user.id,
            role=UserRole.WORKER,
            rating=4,
        )
        async_session.add(review)
        await async_session.commit()
        await async_session.refresh(review)

        assert review.role == UserRole.WORKER
        assert review.reviewer_id == test_worker_profile.user_id
        assert review.reviewee_id == customer_test_user.id

    @pytest.mark.unit
    async def test_both_directions_allowed_for_same_job(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile
    ):
        """Test that a customer->worker review and a worker->customer review can coexist on the same job."""
        customer_review = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            role=UserRole.CUSTOMER,
            rating=5,
        )
        worker_review = Review(
            job_id=test_job.id,
            reviewer_id=test_worker_profile.user_id,
            reviewee_id=customer_test_user.id,
            role=UserRole.WORKER,
            rating=4,
        )
        async_session.add_all([customer_review, worker_review])
        await async_session.commit()

        result = await async_session.execute(select(Review).where(Review.job_id == test_job.id))
        reviews = result.scalars().all()
        assert len(reviews) == 2

    @pytest.mark.unit
    async def test_unique_job_reviewer_constraint(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile
    ):
        """Test that the same reviewer can't leave two reviews on the same job."""
        review1 = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            role=UserRole.CUSTOMER,
            rating=5,
        )
        async_session.add(review1)
        await async_session.commit()

        review2 = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            role=UserRole.CUSTOMER,
            rating=3,
        )
        async_session.add(review2)

        with pytest.raises(IntegrityError):
            await async_session.commit()

    @pytest.mark.unit
    @pytest.mark.parametrize("invalid_rating", [0, 6, -1])
    async def test_rating_check_constraint_rejects_out_of_range(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, invalid_rating: int
    ):
        """Test that the DB check constraint rejects ratings outside 1-5."""
        review = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            rating=invalid_rating,
        )
        async_session.add(review)

        with pytest.raises(IntegrityError):
            await async_session.commit()

    @pytest.mark.unit
    @pytest.mark.parametrize("boundary_rating", [1, 5])
    async def test_rating_check_constraint_allows_boundary_values(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, boundary_rating: int
    ):
        """Test that ratings of exactly 1 and 5 are accepted."""
        review = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            rating=boundary_rating,
        )
        async_session.add(review)
        await async_session.commit()
        await async_session.refresh(review)

        assert review.rating == boundary_rating

    @pytest.mark.unit
    async def test_cascade_delete_on_job_deletion(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile
    ):
        """Test that deleting a job also deletes its reviews."""
        review = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            rating=5,
        )
        async_session.add(review)
        await async_session.commit()
        review_id = review.id

        await async_session.delete(test_job)
        await async_session.commit()

        result = await async_session.execute(select(Review).where(Review.id == review_id))
        assert result.scalar_one_or_none() is None

    @pytest.mark.unit
    async def test_cascade_delete_on_reviewer_deletion(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile
    ):
        """Test that deleting the reviewer also deletes their review."""
        review = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            rating=5,
        )
        async_session.add(review)
        await async_session.commit()
        review_id = review.id

        await async_session.delete(customer_test_user)
        await async_session.commit()

        result = await async_session.execute(select(Review).where(Review.id == review_id))
        assert result.scalar_one_or_none() is None

    @pytest.mark.unit
    async def test_cascade_delete_on_reviewee_deletion(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile
    ):
        """Test that deleting the reviewee also deletes reviews about them."""
        review = Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            rating=5,
        )
        async_session.add(review)
        await async_session.commit()
        review_id = review.id

        worker_user = await async_session.get(User, test_worker_profile.user_id)
        await async_session.delete(worker_user)
        await async_session.commit()

        result = await async_session.execute(select(Review).where(Review.id == review_id))
        assert result.scalar_one_or_none() is None
