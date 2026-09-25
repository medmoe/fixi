from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.exceptions.http_exceptions import BadRequestException, NotFoundException
from ..crud.crud_admin_action_log import crud_admin_action_log
from ..crud.crud_worker_profiles import crud_worker_profiles
from ..models import User, WorkerProfile
from ..schemas.admin_action_log import AdminActionLogCreateInternal
from ..schemas.worker_profile import WorkerProfileRead, WorkerProfileUpdateInternal, WorkerVerificationQueueRead
from .minio_client import minio_client
from .notifications import notify_user

TARGET_TYPE_WORKER_PROFILE = "worker_profile"


async def _get_worker_profile_or_404(db: AsyncSession, user_id: int) -> WorkerProfileRead:
    worker_profile = await crud_worker_profiles.get(
        db=db, user_id=user_id, schema_to_select=WorkerProfileRead, return_as_model=True
    )
    if worker_profile is None:
        raise NotFoundException("Worker profile not found")
    return worker_profile


async def list_pending_worker_verifications(db: AsyncSession) -> list[WorkerVerificationQueueRead]:
    """Workers waiting on CNI review -- unverified, with a document already
    uploaded. A worker who hasn't uploaded anything yet has nothing for an
    admin to review, so they don't clutter the queue."""
    stmt = (
        select(WorkerProfile.id, WorkerProfile.user_id, User.name, User.email, WorkerProfile.bio, WorkerProfile.years_of_experience)
        .join(User, User.id == WorkerProfile.user_id)
        .where(WorkerProfile.is_verified.is_(False), WorkerProfile.cni_document_key.is_not(None))
        .order_by(WorkerProfile.id.asc())
    )
    result = await db.execute(stmt)
    return [
        WorkerVerificationQueueRead(id=row.id, user_id=row.user_id, name=row.name, email=row.email, bio=row.bio, years_of_experience=row.years_of_experience)
        for row in result.all()
    ]


async def get_verification_document_url(db: AsyncSession, worker_profile_id: int) -> str:
    worker_profile = await db.get(WorkerProfile, worker_profile_id)
    if worker_profile is None:
        raise NotFoundException(f"Worker profile with id {worker_profile_id} not found")
    if worker_profile.cni_document_key is None:
        raise NotFoundException("This worker profile has no uploaded CNI document")

    return minio_client.generate_presigned_get_url(bucket=settings.APP_S3_BUCKET_VERIFICATION, key=worker_profile.cni_document_key)


async def approve_worker_verification(db: AsyncSession, worker_profile_id: int, admin_id: int | None = None) -> WorkerProfileRead:
    """Sets is_verified=True and sends the existing "worker verification
    approved" notification -- the single place this happens, so both the
    legacy PATCH /worker-profile/{id}/verify endpoint and the admin queue's
    approve action go through the same logic (Issue 5 acceptance
    criteria: "not a separate ad-hoc send")."""
    worker_profile = await db.get(WorkerProfile, worker_profile_id)
    if worker_profile is None:
        raise NotFoundException(f"Worker profile with id {worker_profile_id} not found")

    if worker_profile.is_verified:
        return await _get_worker_profile_or_404(db=db, user_id=worker_profile.user_id)

    updated = await crud_worker_profiles.update(
        db=db,
        object=WorkerProfileUpdateInternal(is_verified=True),
        user_id=worker_profile.user_id,
        schema_to_select=WorkerProfileRead,
        return_as_model=True,
    )

    await notify_user(
        db,
        event_type="worker_verification_approved",
        user_id=worker_profile.user_id,
        title_ar="تم التحقق من ملفك الشخصي",
        title_fr="Votre profil a été vérifié",
        title_en="Your profile has been verified",
        body_ar="تم التحقق من ملفك المهني من قبل فريقنا.",
        body_fr="Votre profil professionnel a été vérifié par notre équipe.",
        body_en="Your professional profile has been verified by our team.",
        email_payload={"app_url": f"{settings.FRONTEND_BASE_URL}/dashboard"},
    )

    if admin_id is not None:
        await crud_admin_action_log.create(
            db=db,
            object=AdminActionLogCreateInternal(
                action="approve_worker_verification", target_type=TARGET_TYPE_WORKER_PROFILE,
                target_id=worker_profile_id, actor_id=admin_id,
            ),
        )

    return cast(WorkerProfileRead, updated)


async def reject_worker_verification(db: AsyncSession, worker_profile_id: int, admin_id: int, reason: str) -> WorkerProfileRead:
    """Clears cni_document_key -- a rejected worker must re-upload before
    reappearing in the queue, rather than leaving a stale rejected document
    that would just get rejected again on every future pass."""
    worker_profile = await db.get(WorkerProfile, worker_profile_id)
    if worker_profile is None:
        raise NotFoundException(f"Worker profile with id {worker_profile_id} not found")
    if worker_profile.is_verified:
        raise BadRequestException("This worker profile is already verified")

    updated = await crud_worker_profiles.update(
        db=db,
        object=WorkerProfileUpdateInternal(cni_document_key=None),
        user_id=worker_profile.user_id,
        schema_to_select=WorkerProfileRead,
        return_as_model=True,
    )

    await notify_user(
        db,
        event_type="worker_verification_rejected",
        user_id=worker_profile.user_id,
        title_ar="لم يتم التحقق من ملفك الشخصي",
        title_fr="Votre profil n'a pas été vérifié",
        title_en="Your profile could not be verified",
        body_ar=f"لم يتمكن فريقنا من التحقق من وثيقتك. السبب: {reason}. يرجى رفع وثيقة جديدة.",
        body_fr=f"Notre équipe n'a pas pu vérifier votre document. Motif : {reason}. Veuillez téléverser un nouveau document.",
        body_en=f"Our team could not verify your document. Reason: {reason}. Please upload a new document.",
        email_payload={"app_url": f"{settings.FRONTEND_BASE_URL}/dashboard", "reason": reason},
    )

    await crud_admin_action_log.create(
        db=db,
        object=AdminActionLogCreateInternal(
            action="reject_worker_verification", target_type=TARGET_TYPE_WORKER_PROFILE,
            target_id=worker_profile_id, actor_id=admin_id, reason=reason,
        ),
    )

    return cast(WorkerProfileRead, updated)
