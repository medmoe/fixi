import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from src.app.models import JobApplication, ApplicationStatus, Job, WorkerProfile


class TestJobApplicationModel:

    # ------------------------------------------------------------------ #
    #  Basic creation                                                    #
    # ------------------------------------------------------------------ #

    async def test_create_job_application_with_defaults(
            self, async_session, test_job, test_worker_profile
    ):
        application = JobApplication(
            job_id=test_job.id,
            worker_profile_id=test_worker_profile.id,
        )
        async_session.add(application)
        await async_session.commit()
        await async_session.refresh(application)

        assert application.id is not None
        assert application.status == ApplicationStatus.PENDING
        assert application.message is None
        assert application.created_at is not None

    async def test_create_job_application_with_message(
            self, async_session, test_job, test_worker_profile
    ):
        application = JobApplication(
            job_id=test_job.id,
            worker_profile_id=test_worker_profile.id,
            message="I have 5 years of plumbing experience and can start immediately.",
        )
        async_session.add(application)
        await async_session.commit()
        await async_session.refresh(application)

        assert application.message == "I have 5 years of plumbing experience and can start immediately."

    async def test_create_job_application_with_explicit_status(
            self, async_session, test_job, test_worker_profile
    ):
        application = JobApplication(
            job_id=test_job.id,
            worker_profile_id=test_worker_profile.id,
            status=ApplicationStatus.ACCEPTED,
        )
        async_session.add(application)
        await async_session.commit()
        await async_session.refresh(application)

        assert application.status == ApplicationStatus.ACCEPTED

    # ------------------------------------------------------------------ #
    #  Status enum                                                         #
    # ------------------------------------------------------------------ #

    @pytest.mark.parametrize("status", [
        ApplicationStatus.PENDING,
        ApplicationStatus.ACCEPTED,
        ApplicationStatus.REJECTED,
    ])
    async def test_all_status_values_are_persistable(
            self, async_session, test_job, test_worker_profile, status
    ):
        application = JobApplication(
            job_id=test_job.id,
            worker_profile_id=test_worker_profile.id,
            status=status,
        )
        async_session.add(application)
        await async_session.commit()
        await async_session.refresh(application)

        assert application.status == status

    async def test_status_stored_as_lowercase_value_in_db(
            self, async_session, test_job, test_worker_profile
    ):
        """values_callable ensures the DB stores 'pending', not 'PENDING'."""
        application = JobApplication(
            job_id=test_job.id,
            worker_profile_id=test_worker_profile.id,
            status=ApplicationStatus.PENDING,
        )
        async_session.add(application)
        await async_session.commit()

        result = await async_session.execute(
            text("SELECT status FROM job_applications WHERE id = :id"),
            {"id": application.id},
        )
        raw_value = result.scalar_one()
        assert raw_value == "pending"

    # ------------------------------------------------------------------ #
    #  Uniqueness — one application per (job, worker) pair                 #
    # ------------------------------------------------------------------ #

    async def test_same_worker_cannot_apply_twice_to_same_job(
            self, async_session, test_job, test_worker_profile
    ):
        first = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)
        async_session.add(first)
        await async_session.commit()

        duplicate = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)
        async_session.add(duplicate)

        with pytest.raises(IntegrityError):
            await async_session.commit()

    async def test_different_workers_can_apply_to_same_job(
            self, async_session, test_job, test_worker_profile, test_other_worker_profile
    ):
        app_1 = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)
        app_2 = JobApplication(job_id=test_job.id, worker_profile_id=test_other_worker_profile.id)
        async_session.add_all([app_1, app_2])
        await async_session.commit()  # must not raise

        result = await async_session.execute(
            select(JobApplication).where(JobApplication.job_id == test_job.id)
        )
        applications = result.scalars().all()
        assert len(applications) == 2

    async def test_same_worker_can_apply_to_different_jobs(
            self, async_session, test_worker_profile, test_job, job_other_user
    ):
        app_1 = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)
        app_2 = JobApplication(job_id=job_other_user.id, worker_profile_id=test_worker_profile.id)
        async_session.add_all([app_1, app_2])
        await async_session.commit()  # must not raise

        result = await async_session.execute(
            select(JobApplication).where(JobApplication.worker_profile_id == test_worker_profile.id)
        )
        applications = result.scalars().all()
        assert len(applications) == 2

    # ------------------------------------------------------------------ #
    #  Required fields / constraints                                       #
    # ------------------------------------------------------------------ #

    async def test_job_id_is_required(self, async_session, test_worker_profile):
        application = JobApplication(job_id=None, worker_profile_id=test_worker_profile.id)
        async_session.add(application)
        with pytest.raises(IntegrityError):
            await async_session.commit()

    async def test_worker_profile_id_is_required(self, async_session, test_job):
        application = JobApplication(job_id=test_job.id, worker_profile_id=None)
        async_session.add(application)
        with pytest.raises(IntegrityError):
            await async_session.commit()

    async def test_nonexistent_job_id_raises_integrity_error(
            self, async_session, test_worker_profile
    ):
        application = JobApplication(job_id=999999, worker_profile_id=test_worker_profile.id)
        async_session.add(application)
        with pytest.raises(IntegrityError):
            await async_session.commit()

    async def test_nonexistent_worker_profile_id_raises_integrity_error(
            self, async_session, test_job
    ):
        application = JobApplication(job_id=test_job.id, worker_profile_id=999999)
        async_session.add(application)
        with pytest.raises(IntegrityError):
            await async_session.commit()

    async def test_message_is_optional(self, async_session, test_job, test_worker_profile):
        application = JobApplication(
            job_id=test_job.id,
            worker_profile_id=test_worker_profile.id,
            message=None,
        )
        async_session.add(application)
        await async_session.commit()
        await async_session.refresh(application)
        assert application.message is None

    # ------------------------------------------------------------------ #
    #  Cascade delete                                                      #
    # ------------------------------------------------------------------ #

    @pytest.mark.parametrize("parent_model, parent_attr", [
        (Job, "job_id"),
        (WorkerProfile, "worker_profile_id"),
    ])
    async def test_cascade_delete_on_parent_removal(
            self, async_session, test_job_application, parent_model, parent_attr
    ):
        parent = await async_session.get(parent_model, getattr(test_job_application, parent_attr))
        await async_session.delete(parent)
        await async_session.commit()

        result = await async_session.execute(
            select(JobApplication).where(JobApplication.id == test_job_application.id)
        )
        assert result.scalar_one_or_none() is None

    # ------------------------------------------------------------------ #
    #  Timestamps (TimestampMixin)                                         #
    # ------------------------------------------------------------------ #

    async def test_created_at_is_set_on_creation(
            self, async_session, test_job, test_worker_profile
    ):
        application = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)
        async_session.add(application)
        await async_session.commit()
        await async_session.refresh(application)
        assert application.created_at is not None

    async def test_updated_at_changes_on_status_update(
            self, async_session, test_job_application
    ):
        original_updated_at = test_job_application.updated_at
        test_job_application.status = ApplicationStatus.ACCEPTED
        await async_session.commit()
        await async_session.refresh(test_job_application)
        assert test_job_application.updated_at != original_updated_at
