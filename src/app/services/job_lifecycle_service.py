from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..core.exceptions.http_exceptions import BadRequestException, ForbiddenException
from ..models import ApplicationDeclineReason, ApplicationStatus, Job, JobApplication, JobStatus, WorkerProfile
from ..schemas.job import JobRead
from ..schemas.job_application import JobApplicationRead
from .notifications import notify_user
from .review_eligibility_service import get_accepted_worker_user_id


async def _get_job_with_relations(db: AsyncSession, job_id: int) -> Job:
    stmt = select(Job).options(joinedload(Job.trade_category), joinedload(Job.user)).where(Job.id == job_id)
    result = await db.execute(stmt)
    return result.unique().scalar_one()


async def _get_application_with_relations(db: AsyncSession, application_id: int) -> JobApplication:
    stmt = (
        select(JobApplication)
        .options(
            joinedload(JobApplication.job).joinedload(Job.user),
            joinedload(JobApplication.job).joinedload(Job.trade_category),
            joinedload(JobApplication.worker_profile).joinedload(WorkerProfile.user),
            joinedload(JobApplication.worker_profile).selectinload(WorkerProfile.worker_trades),
        )
        .where(JobApplication.id == application_id)
    )
    result = await db.execute(stmt)
    return result.unique().scalar_one()


async def _reject_other_applications(db: AsyncSession, job_id: int, winning_application_id: int) -> list[int]:
    """Called the moment an application reaches mutual confirmation --
    every other application on the job (pending or accepted) loses out.
    Returns the user_ids of the rejected workers, for notifying them."""
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.job_id == job_id,
            JobApplication.id != winning_application_id,
            JobApplication.status != ApplicationStatus.REJECTED,
        )
    )
    others = result.scalars().all()
    for other in others:
        other.status = ApplicationStatus.REJECTED
        other.decline_reason = ApplicationDeclineReason.ANOTHER_APPLICANT_SELECTED

    if not others:
        return []
    profile_ids = [other.worker_profile_id for other in others]
    user_ids_result = await db.execute(select(WorkerProfile.user_id).where(WorkerProfile.id.in_(profile_ids)))
    return [row[0] for row in user_ids_result.all()]


async def confirm_application(db: AsyncSession, job: Job, application: JobApplication, user_id: int) -> JobApplicationRead:
    """
    The worker's half of the mutual assignment handshake -- the customer's
    half is already implied by status=ACCEPTED. Once both are in, the job
    moves to ASSIGNED and every other application on it is auto-rejected.
    """
    worker_profile = await db.get(WorkerProfile, application.worker_profile_id)
    if worker_profile is None or worker_profile.user_id != user_id:
        raise ForbiddenException("Only the applicant can confirm this application")

    if application.status != ApplicationStatus.ACCEPTED:
        raise BadRequestException("Only an accepted application can be confirmed")
    if job.status != JobStatus.OPEN:
        raise BadRequestException(f"Cannot confirm — job is no longer open. Current status: {job.status.value}")

    application.worker_confirmed_at = datetime.now(UTC)
    job.status = JobStatus.ASSIGNED
    rejected_worker_user_ids = await _reject_other_applications(db, job.id, application.id)

    await db.commit()

    await notify_user(
        db,
        event_type="job_application.confirmed",
        user_id=job.user_id,
        title_ar="تم تعيين المهمة",
        title_fr="Mission assignée",
        body_ar=f"قام محترف بتأكيد التعيين وهو الآن مسؤول عن مهمة «{job.title}».",
        body_fr=f"Un professionnel a confirmé et est maintenant assigné à « {job.title} ».",
        related_job_id=job.id,
    )
    for rejected_user_id in rejected_worker_user_ids:
        await notify_user(
            db,
            event_type="job_application.rejected",
            user_id=rejected_user_id,
            title_ar="لم يتم قبول طلبك",
            title_fr="Candidature non retenue",
            body_ar=f"تم اختيار محترف آخر لمهمة «{job.title}».",
            body_fr=f"Un autre professionnel a été choisi pour « {job.title} ».",
            related_job_id=job.id,
        )

    return JobApplicationRead.model_validate(await _get_application_with_relations(db, application.id))


async def withdraw_application(
        db: AsyncSession, job: Job, application: JobApplication, user_id: int, reason: ApplicationDeclineReason
) -> JobApplicationRead:
    """Worker retracts their own application -- while it's still pending, or
    after being accepted but before the job is actually assigned (i.e. before
    both sides confirmed). Backing out of an already-assigned job is a
    separate, bigger concern than a plain withdrawal and isn't handled here."""
    worker_profile = await db.get(WorkerProfile, application.worker_profile_id)
    if worker_profile is None or worker_profile.user_id != user_id:
        raise ForbiddenException("Only the applicant can withdraw this application")

    if application.status == ApplicationStatus.REJECTED:
        raise BadRequestException("This application has already been rejected")
    if job.status != JobStatus.OPEN:
        raise BadRequestException(f"Cannot withdraw — job is no longer open. Current status: {job.status.value}")

    application.status = ApplicationStatus.REJECTED
    application.decline_reason = reason

    await db.commit()

    await notify_user(
        db,
        event_type="job_application.withdrawn",
        user_id=job.user_id,
        title_ar="تم سحب الطلب",
        title_fr="Candidature retirée",
        body_ar=f"قام المحترف بسحب طلبه لمهمة «{job.title}».",
        body_fr=f"Le professionnel a retiré sa candidature pour « {job.title} ».",
        related_job_id=job.id,
    )

    return JobApplicationRead.model_validate(await _get_application_with_relations(db, application.id))


async def start_job(db: AsyncSession, job: Job, user_id: int) -> JobRead:
    """Worker marks the job as started. Single-sided — lower stakes than the
    assignment/completion handshakes, since it carries no payment or review implication."""
    accepted_worker_user_id = await get_accepted_worker_user_id(db, job.id)
    if accepted_worker_user_id != user_id:
        raise ForbiddenException("Only the assigned worker can start this job")

    if job.status != JobStatus.ASSIGNED:
        raise BadRequestException(f"Cannot start — job must be assigned first. Current status: {job.status.value}")

    job.status = JobStatus.IN_PROGRESS
    await db.commit()

    await notify_user(
        db,
        event_type="job.started",
        user_id=job.user_id,
        title_ar="بدأ العمل",
        title_fr="Travail démarré",
        body_ar=f"بدأ المحترف العمل على مهمة «{job.title}».",
        body_fr=f"Le professionnel a commencé à travailler sur « {job.title} ».",
        related_job_id=job.id,
    )

    return JobRead.model_validate(await _get_job_with_relations(db, job.id))


async def mark_job_complete(db: AsyncSession, job: Job, user_id: int) -> JobRead:
    """
    Either participant marks their side of the job as done. Neither can force
    completion alone -- the job only flips to COMPLETED once both timestamps
    are set, which is also the trigger our review eligibility checks for.
    """
    is_customer = job.user_id == user_id
    accepted_worker_user_id = await get_accepted_worker_user_id(db, job.id)
    is_worker = accepted_worker_user_id == user_id

    if not is_customer and not is_worker:
        raise ForbiddenException("You are not a participant in this job")
    if job.status != JobStatus.IN_PROGRESS:
        raise BadRequestException(f"Cannot mark complete — job must be in progress. Current status: {job.status.value}")

    if is_customer:
        if job.customer_marked_complete_at is not None:
            raise BadRequestException("You have already marked this job complete")
        job.customer_marked_complete_at = datetime.now(UTC)
    else:
        if job.worker_marked_complete_at is not None:
            raise BadRequestException("You have already marked this job complete")
        job.worker_marked_complete_at = datetime.now(UTC)

    if job.customer_marked_complete_at is not None and job.worker_marked_complete_at is not None:
        job.status = JobStatus.COMPLETED

    await db.commit()

    if job.status == JobStatus.COMPLETED:
        for participant_user_id in (job.user_id, accepted_worker_user_id):
            await notify_user(
                db,
                event_type="job.completed",
                user_id=participant_user_id,
                title_ar="اكتملت المهمة",
                title_fr="Mission terminée",
                body_ar=f"تم تحديد مهمة «{job.title}» كمكتملة من الطرفين.",
                body_fr=f"« {job.title} » est marqué comme terminé par les deux parties.",
                related_job_id=job.id,
            )
    else:
        other_user_id = accepted_worker_user_id if is_customer else job.user_id
        await notify_user(
            db,
            event_type="job.completion_pending_confirmation",
            user_id=other_user_id,
            title_ar="مطلوب تأكيد",
            title_fr="Confirmation requise",
            body_ar=f"قام الطرف الآخر بتحديد مهمة «{job.title}» كمكتملة. يرجى التأكيد من جانبك أيضاً.",
            body_fr=f"L'autre partie a marqué « {job.title} » comme terminé. Merci de confirmer à votre tour.",
            related_job_id=job.id,
        )

    return JobRead.model_validate(await _get_job_with_relations(db, job.id))
