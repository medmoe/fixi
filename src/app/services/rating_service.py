from decimal import Decimal
from typing import TypedDict

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Review, WorkerProfile


class WorkerRatingSnapshot(TypedDict):
    average_rating: Decimal | None
    review_count: int


async def recalculate_worker_rating(db: AsyncSession, worker_id: int) -> WorkerRatingSnapshot:
    """
    Recomputes average_rating/review_count for the worker identified by
    worker_id (their users.id -- the same value as reviews.reviewee_id and
    worker_profiles.user_id) from non-flagged reviews, and persists the
    result on worker_profiles in a single UPDATE.

    Does not commit -- callers run this within the same transaction as the
    review write that triggered it (a review insert, or later a moderator
    flagging/removing one), so both changes land atomically together.
    """
    await db.flush()  # make any just-added/updated review visible to the aggregate below

    result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(Review.reviewee_id == worker_id, Review.is_flagged.is_(False))
    )
    average_rating, review_count = result.one()
    average_rating = round(average_rating, 2) if average_rating is not None else None

    await db.execute(
        update(WorkerProfile)
        .where(WorkerProfile.user_id == worker_id)
        .values(average_rating=average_rating, review_count=review_count)
    )

    return {"average_rating": average_rating, "review_count": review_count}
