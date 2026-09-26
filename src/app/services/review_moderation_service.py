from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from ..core.exceptions.http_exceptions import BadRequestException, NotFoundException
from ..crud.crud_admin_action_log import crud_admin_action_log
from ..models import Review, ReviewReport, User, UserRole
from ..schemas.admin_action_log import AdminActionLogCreateInternal
from ..schemas.review import FlaggedReviewRead
from .rating_service import recalculate_worker_rating

TARGET_TYPE_REVIEW = "review"


async def report_review(db: AsyncSession, review_id: int, reporter_id: int, reason: str | None = None) -> None:
    """Records a single user's report of a review. The unique constraint on
    (review_id, reporter_id) is what actually enforces "no duplicate-flag
    spam" -- this just turns that constraint violation into a friendly
    error instead of a 500."""
    review = await db.get(Review, review_id)
    if review is None:
        raise NotFoundException(f"Review with id {review_id} not found")
    if review.is_flagged:
        raise BadRequestException("This review has already been removed")

    db.add(ReviewReport(review_id=review_id, reporter_id=reporter_id, reason=reason))
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise BadRequestException("You have already reported this review") from e


async def list_flagged_reviews(db: AsyncSession) -> list[FlaggedReviewRead]:
    """The admin moderation queue -- reviews with at least one pending
    report that haven't already been removed. A review approved out of the
    queue has its reports cleared (see approve_flagged_review), so it only
    reappears here if reported again."""
    reviewer = aliased(User)
    reviewee = aliased(User)

    stmt = (
        select(
            Review.id, Review.rating, Review.comment, Review.created_at,
            reviewer.name.label("reviewer_name"), reviewee.name.label("reviewee_name"),
            func.count(ReviewReport.id).label("report_count"),
        )
        .join(ReviewReport, ReviewReport.review_id == Review.id)
        .join(reviewer, reviewer.id == Review.reviewer_id)
        .join(reviewee, reviewee.id == Review.reviewee_id)
        .where(Review.is_flagged.is_(False))
        .group_by(Review.id, Review.rating, Review.comment, Review.created_at, reviewer.name, reviewee.name)
        .order_by(Review.created_at.asc())
    )
    result = await db.execute(stmt)
    return [FlaggedReviewRead.model_validate(row) for row in result.all()]


async def approve_flagged_review(db: AsyncSession, review_id: int, admin_id: int) -> None:
    """The report(s) were unfounded -- dismiss them and leave the review
    visible. Does not touch is_flagged or the rating aggregate."""
    review = await db.get(Review, review_id)
    if review is None:
        raise NotFoundException(f"Review with id {review_id} not found")

    await db.execute(delete(ReviewReport).where(ReviewReport.review_id == review_id))
    await crud_admin_action_log.create(
        db=db,
        object=AdminActionLogCreateInternal(
            action="approve_review", target_type=TARGET_TYPE_REVIEW, target_id=review_id, actor_id=admin_id,
        ),
    )


async def remove_flagged_review(db: AsyncSession, review_id: int, admin_id: int) -> None:
    """Hides the review from public listings and the rating aggregate
    (Review.is_flagged, already filtered everywhere it's read) and
    immediately recalculates the affected worker's avg_rating in the same
    transaction -- the issue's acceptance criteria."""
    review = await db.get(Review, review_id)
    if review is None:
        raise NotFoundException(f"Review with id {review_id} not found")
    if review.is_flagged:
        raise BadRequestException("This review has already been removed")

    review.is_flagged = True
    if review.role == UserRole.CUSTOMER:
        # the reviewer was the customer, so the reviewee is the worker --
        # customer_profiles carries no rating snapshot to recalculate.
        await recalculate_worker_rating(db, worker_id=review.reviewee_id)

    await crud_admin_action_log.create(
        db=db,
        object=AdminActionLogCreateInternal(
            action="remove_review", target_type=TARGET_TYPE_REVIEW, target_id=review_id, actor_id=admin_id,
        ),
    )
