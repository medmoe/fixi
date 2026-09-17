import base64
import json
import math
from datetime import datetime
from typing import Any

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Review, User, WorkerProfile
from ..schemas.review import ReviewPublicRead, ReviewSortBy, WorkerReviewsMeta, WorkerReviewsResponse


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
    Not a FastCRUD subclass -- there's no Review create/update schema yet
    (that lands with the review-submission endpoint), and this query
    (composite keyset cursor, reviewer-name join, privacy-filtered columns)
    doesn't fit FastCRUD's generic verbs anyway.
    """

    async def get_public_reviews_for_worker(
            self,
            db: AsyncSession,
            worker_profile: WorkerProfile,
            limit: int = 10,
            cursor: str | None = None,
            sort_by: ReviewSortBy = ReviewSortBy.recent,
    ) -> WorkerReviewsResponse:
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

        review_count = worker_profile.review_count
        meta = WorkerReviewsMeta(
            average_rating=worker_profile.average_rating,
            review_count=review_count,
            total_pages=math.ceil(review_count / limit) if review_count else 0,
        )

        return WorkerReviewsResponse(data=data, next_cursor=next_cursor, meta=meta)


crud_reviews = CRUDReview()
