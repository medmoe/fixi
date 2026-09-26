from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...schemas.review import FlaggedReviewRead
from ...services.review_moderation_service import approve_flagged_review, list_flagged_reviews, remove_flagged_review

router = APIRouter(tags=["admin"], prefix="/admin/flagged-reviews", dependencies=[Depends(get_current_superuser)])


# ─── GET /admin/flagged-reviews ───────────────────────────────────────────────
@router.get("", response_model=list[FlaggedReviewRead], status_code=200)
async def list_flagged_reviews_endpoint(
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[FlaggedReviewRead]:
    """Reviews with at least one pending report, awaiting a moderation
    decision."""
    return await list_flagged_reviews(db)


# ─── POST /admin/flagged-reviews/{review_id}/approve ─────────────────────────
@router.post("/{review_id}/approve", status_code=204)
async def approve_flagged_review_endpoint(
        review_id: int,
        admin: Annotated[dict, Depends(get_current_superuser)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """The report was unfounded -- dismiss it, the review stays visible."""
    await approve_flagged_review(db, review_id, admin_id=admin["id"])


# ─── POST /admin/flagged-reviews/{review_id}/remove ──────────────────────────
@router.post("/{review_id}/remove", status_code=204)
async def remove_flagged_review_endpoint(
        review_id: int,
        admin: Annotated[dict, Depends(get_current_superuser)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """Hides the review and immediately recalculates the affected worker's
    avg_rating."""
    await remove_flagged_review(db, review_id, admin_id=admin["id"])
