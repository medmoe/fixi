"""Unit tests for review_moderation_service -- reporting reviews and the
admin approve/remove moderation queue (Phase 8 Issue 7)."""

from decimal import Decimal

import pytest
from sqlalchemy import select

from src.app.core.exceptions.http_exceptions import BadRequestException, NotFoundException
from src.app.models import AdminActionLog, Job, Review, ReviewReport, TradeCategory, User, UserRole, WorkerProfile
from src.app.services.review_moderation_service import (
    approve_flagged_review,
    list_flagged_reviews,
    remove_flagged_review,
    report_review,
)
from tests.job.helpers import create_test_job


async def leave_review(async_session, job: Job, reviewer: User, worker_profile: WorkerProfile, **overrides) -> Review:
    defaults = {"job_id": job.id, "reviewer_id": reviewer.id, "reviewee_id": worker_profile.user_id, "role": UserRole.CUSTOMER, "rating": 5}
    defaults.update(overrides)
    review = Review(**defaults)
    async_session.add(review)
    await async_session.commit()
    await async_session.refresh(review)
    return review


class TestReportReview:
    @pytest.mark.unit
    async def test_creates_a_report(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)

        await report_review(async_session, review.id, reporter_id=other_customer_test_user.id, reason="Spam")

        result = await async_session.execute(
            select(ReviewReport).where(ReviewReport.review_id == review.id, ReviewReport.reporter_id == other_customer_test_user.id)
        )
        report = result.scalar_one()
        assert report.reason == "Spam"

    @pytest.mark.unit
    async def test_raises_not_found_for_a_missing_review(self, async_session, customer_test_user: User):
        with pytest.raises(NotFoundException):
            await report_review(async_session, 999_999, reporter_id=customer_test_user.id)

    @pytest.mark.unit
    async def test_raises_bad_request_for_a_duplicate_report(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        await report_review(async_session, review.id, reporter_id=other_customer_test_user.id)

        with pytest.raises(BadRequestException):
            await report_review(async_session, review.id, reporter_id=other_customer_test_user.id)

    @pytest.mark.unit
    async def test_raises_bad_request_for_an_already_removed_review(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile, is_flagged=True)

        with pytest.raises(BadRequestException):
            await report_review(async_session, review.id, reporter_id=other_customer_test_user.id)


class TestListFlaggedReviews:
    @pytest.mark.unit
    async def test_returns_reviews_with_pending_reports(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile, comment="Rude")
        await report_review(async_session, review.id, reporter_id=other_customer_test_user.id, reason="Rude comment")

        queue = await list_flagged_reviews(async_session)

        assert len(queue) == 1
        assert queue[0].id == review.id
        assert queue[0].report_count == 1
        assert queue[0].reviewer_name == customer_test_user.name

    @pytest.mark.unit
    async def test_excludes_reviews_with_no_reports(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile
    ):
        await leave_review(async_session, test_job, customer_test_user, test_worker_profile)

        queue = await list_flagged_reviews(async_session)

        assert queue == []

    @pytest.mark.unit
    async def test_excludes_already_removed_reviews(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile, is_flagged=True)
        async_session.add(ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id))
        await async_session.commit()

        queue = await list_flagged_reviews(async_session)

        assert queue == []

    @pytest.mark.unit
    async def test_report_count_reflects_multiple_reports(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
            other_customer_test_user: User, test_admin_user: User,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        await report_review(async_session, review.id, reporter_id=other_customer_test_user.id)
        await report_review(async_session, review.id, reporter_id=test_admin_user.id)

        queue = await list_flagged_reviews(async_session)

        assert queue[0].report_count == 2


class TestApproveFlaggedReview:
    @pytest.mark.unit
    async def test_dismisses_reports_and_keeps_review_visible(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
            other_customer_test_user: User, test_admin_user: User,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        await report_review(async_session, review.id, reporter_id=other_customer_test_user.id)

        await approve_flagged_review(async_session, review.id, admin_id=test_admin_user.id)

        await async_session.refresh(review)
        assert review.is_flagged is False
        queue = await list_flagged_reviews(async_session)
        assert queue == []

    @pytest.mark.unit
    async def test_raises_not_found_for_a_missing_review(self, async_session, test_admin_user: User):
        with pytest.raises(NotFoundException):
            await approve_flagged_review(async_session, 999_999, admin_id=test_admin_user.id)

    @pytest.mark.unit
    async def test_logs_an_admin_action(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
            other_customer_test_user: User, test_admin_user: User,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        await report_review(async_session, review.id, reporter_id=other_customer_test_user.id)

        await approve_flagged_review(async_session, review.id, admin_id=test_admin_user.id)

        result = await async_session.execute(
            select(AdminActionLog).where(AdminActionLog.target_type == "review", AdminActionLog.target_id == review.id)
        )
        log = result.scalar_one()
        assert log.action == "approve_review"
        assert log.actor_id == test_admin_user.id


class TestRemoveFlaggedReview:
    @pytest.mark.unit
    async def test_hides_the_review(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
            other_customer_test_user: User, test_admin_user: User,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        await report_review(async_session, review.id, reporter_id=other_customer_test_user.id)

        await remove_flagged_review(async_session, review.id, admin_id=test_admin_user.id)

        await async_session.refresh(review)
        assert review.is_flagged is True

    @pytest.mark.unit
    async def test_recalculates_worker_rating(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
            other_customer_test_user: User, test_admin_user: User, test_trade_category: TradeCategory,
    ):
        await leave_review(async_session, test_job, customer_test_user, test_worker_profile, rating=5)
        job2 = await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)
        bad_review = await leave_review(async_session, job2, customer_test_user, test_worker_profile, rating=1)
        await report_review(async_session, bad_review.id, reporter_id=other_customer_test_user.id)

        await remove_flagged_review(async_session, bad_review.id, admin_id=test_admin_user.id)

        await async_session.refresh(test_worker_profile)
        assert test_worker_profile.average_rating == Decimal("5.00")
        assert test_worker_profile.review_count == 1

    @pytest.mark.unit
    async def test_does_not_recalculate_when_reviewee_is_a_customer(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile, customer_test_user: User,
            other_customer_test_user: User, test_admin_user: User,
    ):
        review = Review(
            job_id=test_job.id, reviewer_id=test_worker_profile.user_id, reviewee_id=customer_test_user.id,
            role=UserRole.WORKER, rating=1,
        )
        async_session.add(review)
        await async_session.commit()
        await async_session.refresh(review)
        await report_review(async_session, review.id, reporter_id=other_customer_test_user.id)

        await remove_flagged_review(async_session, review.id, admin_id=test_admin_user.id)

        await async_session.refresh(review)
        assert review.is_flagged is True

    @pytest.mark.unit
    async def test_raises_bad_request_if_already_removed(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, test_admin_user: User
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile, is_flagged=True)

        with pytest.raises(BadRequestException):
            await remove_flagged_review(async_session, review.id, admin_id=test_admin_user.id)

    @pytest.mark.unit
    async def test_raises_not_found_for_a_missing_review(self, async_session, test_admin_user: User):
        with pytest.raises(NotFoundException):
            await remove_flagged_review(async_session, 999_999, admin_id=test_admin_user.id)
