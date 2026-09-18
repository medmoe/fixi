import base64
import json
import math
from datetime import datetime
from typing import Any

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from ..core.exceptions.http_exceptions import BadRequestException, ForbiddenException
from ..models import Job, Review, User, UserRole, WorkerProfile
from ..schemas.review import (
    ReviewCreateRequest,
    ReviewEligibilityReason,
    ReviewPublicRead,
    ReviewSortBy,
    ReviewSubmitResponse,
    WorkerReviewsMeta,
    WorkerReviewsResponse,
)
from ..services.rating_service import recalculate_worker_rating
from ..services.review_eligibility_service import check_review_eligibility, get_accepted_worker_user_id

_ELIGIBILITY_ERROR_MESSAGES = {
    ReviewEligibilityReason.not_a_participant: "You are not a participant in this job.",
    ReviewEligibilityReason.job_not_complete: "This job is not yet complete.",
    ReviewEligibilityReason.already_submitted: "You have already reviewed this job.",
}


def _encode_cursor(sort_value: Any, review_id: int) -> str:
    raw = json.dumps([sort_value, review_id], default=str)
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_cursor(cursor: str, sort_by: ReviewSortBy) -> tuple[Any, int]:
    raw = base64.urlsafe_b64decode(cursor.encode())
    sort_value, review_id = json.loads(raw)
    if sort_by == ReviewSortBy.recent:
        sort_value = datetime.fromisoformat(sort_value)
    return sort_value, review_id


def _format_display_name(full_name: str) -> str:
    """'Kristin Garza' -> 'Kristin G.' -- a single-word name is returned as-is."""
    parts = full_name.split()
    if len(parts) < 2:
        return full_name
    return f"{parts[0]} {parts[-1][0]}."


class CRUDReview:
    """
    Not a FastCRUD subclass -- submission needs the eligibility guards plus
    an atomic rating-snapshot recalculation, and the public list needs a
    composite keyset cursor, a reviewer-name join, and privacy-filtered
    columns. None of that fits FastCRUD's generic verbs.
    """

    async def get_public_reviews_for_worker(
            self,
            db: AsyncSession,
            worker_profile: WorkerProfile,
            limit: int = 10,
            cursor: str | None = None,
            sort_by: ReviewSortBy = ReviewSortBy.recent,
    ) -> WorkerReviewsResponse:
        sort_column: InstrumentedAttribute[Any]
        if sort_by == ReviewSortBy.highest_rated:
            sort_column = Review.rating
        else:
            sort_column = Review.created_at

        where_clauses = [Review.reviewee_id == worker_profile.user_id, Review.is_flagged.is_(False)]

        if cursor:
            cursor_value, cursor_id = _decode_cursor(cursor, sort_by)
            where_clauses.append(
                or_(
                    sort_column < cursor_value,
                    and_(sort_column == cursor_value, Review.id < cursor_id),
                )
            )

        stmt = (
            select(Review.id, Review.rating, Review.comment, Review.created_at, User.name.label("reviewer_name"))
            .join(User, User.id == Review.reviewer_id)
            .where(*where_clauses)
            .order_by(sort_column.desc(), Review.id.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        rows = result.all()

        data = [
            ReviewPublicRead(
                id=row.id,
                rating=row.rating,
                comment=row.comment,
                reviewer_display_name=_format_display_name(row.reviewer_name),
                created_at=row.created_at,
            )
            for row in rows
        ]

        next_cursor = None
        if len(rows) == limit:
            last = rows[-1]
            sort_value = last.rating if sort_by == ReviewSortBy.highest_rated else last.created_at
            next_cursor = _encode_cursor(sort_value, last.id)

        breakdown_result = await db.execute(
            select(Review.rating, func.count(Review.id))
            .where(Review.reviewee_id == worker_profile.user_id, Review.is_flagged.is_(False))
            .group_by(Review.rating)
        )
        counts_by_rating: dict[int, int] = dict(breakdown_result.tuples().all())

        review_count = worker_profile.review_count
        meta = WorkerReviewsMeta(
            average_rating=worker_profile.average_rating,
            review_count=review_count,
            total_pages=math.ceil(review_count / limit) if review_count else 0,
            rating_breakdown={star: counts_by_rating.get(star, 0) for star in range(1, 6)},
        )

        return WorkerReviewsResponse(data=data, next_cursor=next_cursor, meta=meta)

    async def submit_review(
            self,
            db: AsyncSession,
            job: Job,
            user_id: int,
            payload: ReviewCreateRequest,
    ) -> ReviewSubmitResponse:
        """
        Submits a review for a completed job, in whichever direction the
        caller is entitled to (customer -> worker or worker -> customer,
        inferred from the caller's relationship to the job -- never taken
        from the client). Runs the same eligibility guards as the read-only
        /review-status endpoint, then -- when the reviewee is the worker --
        recalculates their rating snapshot in the same transaction as the
        insert, per the atomicity requirement this was built for.
        """
        eligibility = await check_review_eligibility(db, job, user_id)
        if not eligibility.can_review:
            assert eligibility.reason is not None
            message = _ELIGIBILITY_ERROR_MESSAGES[eligibility.reason]
            if eligibility.reason == ReviewEligibilityReason.not_a_participant:
                raise ForbiddenException(message)
            raise BadRequestException(message)

        is_customer = job.user_id == user_id
        if is_customer:
            role = UserRole.CUSTOMER
            reviewee_id = await get_accepted_worker_user_id(db, job.id)
        else:
            role = UserRole.WORKER
            reviewee_id = job.user_id

        # eligibility already confirmed an accepted worker exists whenever is_customer is True
        assert reviewee_id is not None

        review = Review(
            job_id=job.id,
            reviewer_id=user_id,
            reviewee_id=reviewee_id,
            role=role,
            rating=payload.rating,
            comment=payload.comment,
        )
        db.add(review)

        if role == UserRole.CUSTOMER:
            # customer_profiles carries no rating snapshot -- only recalculate
            # when the review is about a worker
            await recalculate_worker_rating(db, worker_id=reviewee_id)

        await db.commit()
        await db.refresh(review)

        return ReviewSubmitResponse.model_validate(review)


crud_reviews = CRUDReview()
