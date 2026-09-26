from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...schemas.review import ReviewReportCreateRequest
from ...services.review_moderation_service import report_review

router = APIRouter(tags=["reviews"], prefix="/reviews")


# ─── POST /reviews/{review_id}/report ────────────────────────────────────────
@router.post("/{review_id}/report", status_code=204)
async def report_review_endpoint(
        review_id: int,
        payload: ReviewReportCreateRequest,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> None:
    """Flags a review as inappropriate/spam. A given user can only report a
    given review once -- see review_moderation_service.report_review."""
    await report_review(db, review_id, reporter_id=current_user["id"], reason=payload.reason)
