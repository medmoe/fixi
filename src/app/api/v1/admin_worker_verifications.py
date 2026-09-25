from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...schemas.worker_profile import WorkerProfileRead, WorkerVerificationQueueRead, WorkerVerificationRejectRequest
from ...services.worker_verification_service import (
    approve_worker_verification,
    get_verification_document_url,
    list_pending_worker_verifications,
    reject_worker_verification,
)

router = APIRouter(tags=["admin"], prefix="/admin/worker-verifications", dependencies=[Depends(get_current_superuser)])


# ─── GET /admin/worker-verifications ─────────────────────────────────────────
@router.get("", response_model=list[WorkerVerificationQueueRead], status_code=200)
async def list_worker_verifications(
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[WorkerVerificationQueueRead]:
    """Workers waiting on CNI review -- unverified with a document uploaded."""
    return await list_pending_worker_verifications(db)


# ─── GET /admin/worker-verifications/{id}/document-url ───────────────────────
@router.get("/{worker_profile_id}/document-url", status_code=200)
async def get_document_url(
        worker_profile_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """A short-lived signed URL for the uploaded CNI document -- never a
    public link (Issue 5 acceptance criteria)."""
    url = await get_verification_document_url(db, worker_profile_id)
    return {"url": url}


# ─── POST /admin/worker-verifications/{id}/approve ───────────────────────────
@router.post("/{worker_profile_id}/approve", response_model=WorkerProfileRead, status_code=200)
async def approve_verification(
        worker_profile_id: int,
        admin: Annotated[dict, Depends(get_current_superuser)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> WorkerProfileRead:
    return await approve_worker_verification(db, worker_profile_id, admin_id=admin["id"])


# ─── POST /admin/worker-verifications/{id}/reject ────────────────────────────
@router.post("/{worker_profile_id}/reject", response_model=WorkerProfileRead, status_code=200)
async def reject_verification(
        worker_profile_id: int,
        payload: WorkerVerificationRejectRequest,
        admin: Annotated[dict, Depends(get_current_superuser)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> WorkerProfileRead:
    return await reject_worker_verification(db, worker_profile_id, admin_id=admin["id"], reason=payload.reason)
