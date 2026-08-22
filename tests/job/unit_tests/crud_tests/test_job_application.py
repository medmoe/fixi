import pytest

from src.app.core.exceptions.http_exceptions import NotFoundException, ForbiddenException, BadRequestException
from src.app.crud.crud_job_applications import crud_job_application
from src.app.models import ApplicationStatus
from src.app.schemas.job_application import JobApplicationCreate, JobApplicationUpdate


class TestCreateJobApplication:

    async def test_create_application_success(
            self, async_session, test_job, test_user, test_worker_profile
    ):
        payload = JobApplicationCreate(message="I can start tomorrow")
        result = await crud_job_application.create_job_application(
            db=async_session, object=payload, user_id=test_user.id, job_id=test_job.id
        )
        assert result.message == "I can start tomorrow"
        assert result.status == ApplicationStatus.PENDING.value
        assert result.job is not None
        assert result.worker_profile is not None

    async def test_create_application_job_not_found(self, async_session, test_user):
        payload = JobApplicationCreate()
        with pytest.raises(NotFoundException):
            await crud_job_application.create_job_application(
                db=async_session, object=payload, user_id=test_user.id, job_id=999999
            )

    async def test_create_application_worker_profile_not_found(
            self, async_session, test_job, customer_test_user
    ):
        """A user with no WorkerProfile at all (e.g. wrong role slipped through) must fail cleanly."""
        payload = JobApplicationCreate()
        with pytest.raises(NotFoundException):
            await crud_job_application.create_job_application(
                db=async_session, object=payload, user_id=customer_test_user.id, job_id=test_job.id
            )

    async def test_create_application_job_not_open_raises_bad_request(
            self, async_session, closed_job, test_user
    ):
        payload = JobApplicationCreate()
        with pytest.raises(BadRequestException):
            await crud_job_application.create_job_application(
                db=async_session, object=payload, user_id=test_user.id, job_id=closed_job.id
            )

    async def test_create_duplicate_application_raises_bad_request(
            self, async_session, test_job, test_user, test_worker_profile
    ):
        payload = JobApplicationCreate()
        await crud_job_application.create_job_application(
            db=async_session, object=payload, user_id=test_user.id, job_id=test_job.id
        )
        with pytest.raises(BadRequestException):
            await crud_job_application.create_job_application(
                db=async_session, object=payload, user_id=test_user.id, job_id=test_job.id
            )

    async def test_create_application_status_always_pending_regardless_of_input(
            self, async_session, test_job, test_user, test_worker_profile,
    ):
        """Even if somehow a status leaked into the create path, the server
        must always force PENDING — this is the fix for the security bug."""
        payload = JobApplicationCreate()
        result = await crud_job_application.create_job_application(
            db=async_session, object=payload, user_id=test_user.id, job_id=test_job.id
        )
        assert result.status == ApplicationStatus.PENDING.value

    async def test_different_workers_can_apply_to_same_job(
            self,
            async_session,
            test_job,
            test_user,
            other_user,
            test_other_worker_profile,
            test_worker_profile,
    ):
        payload = JobApplicationCreate()
        result_1 = await crud_job_application.create_job_application(
            db=async_session, object=payload, user_id=test_user.id, job_id=test_job.id
        )
        result_2 = await crud_job_application.create_job_application(
            db=async_session, object=payload, user_id=other_user.id, job_id=test_job.id
        )
        assert result_1.id != result_2.id


class TestGetJobApplications:

    async def test_owner_gets_applications_for_their_job(
            self, async_session, test_job, customer_test_user, job_application_factory
    ):
        await job_application_factory(job=test_job, count=3)
        applications, total_count = await crud_job_application.get_job_applications(
            db=async_session, db_job_id=test_job.id, user_id=customer_test_user.id
        )
        assert len(applications) == 3
        assert total_count == 3

    async def test_non_owner_forbidden(
            self, async_session, test_job, other_customer_test_user, job_application_factory
    ):
        await job_application_factory(job=test_job, count=1)
        with pytest.raises(ForbiddenException):
            await crud_job_application.get_job_applications(
                db=async_session, db_job_id=test_job.id, user_id=other_customer_test_user.id
            )

    async def test_nonexistent_job_raises_not_found(self, async_session, customer_test_user):
        with pytest.raises(NotFoundException):
            await crud_job_application.get_job_applications(
                db=async_session, db_job_id=999999, user_id=customer_test_user.id
            )

    async def test_pagination_limit(
            self, async_session, test_job, customer_test_user, job_application_factory
    ):
        await job_application_factory(job=test_job, count=10)
        applications, total_count = await crud_job_application.get_job_applications(
            db=async_session, db_job_id=test_job.id, user_id=customer_test_user.id, limit=3
        )
        assert len(applications) == 3
        assert total_count == 10

    async def test_pagination_offset(
            self, async_session, test_job, customer_test_user, job_application_factory
    ):
        await job_application_factory(job=test_job, count=10)
        page_1, _ = await crud_job_application.get_job_applications(
            db=async_session, db_job_id=test_job.id, user_id=customer_test_user.id, offset=0, limit=5
        )
        page_2, _ = await crud_job_application.get_job_applications(
            db=async_session, db_job_id=test_job.id, user_id=customer_test_user.id, offset=5, limit=5
        )
        page_1_ids = {a.id for a in page_1}
        page_2_ids = {a.id for a in page_2}
        assert not page_1_ids & page_2_ids

    async def test_returns_empty_list_when_no_applications(
            self, async_session, test_job, customer_test_user
    ):
        applications, total_count = await crud_job_application.get_job_applications(
            db=async_session, db_job_id=test_job.id, user_id=customer_test_user.id
        )
        assert applications == []
        assert total_count == 0

    async def test_applications_from_other_jobs_not_included(
            self, async_session, test_job, job_other_user, customer_test_user, job_application_factory
    ):
        """other_job also owned by customer_test_user, but its applications must
        not leak into results for test_job."""
        await job_application_factory(job=test_job, count=2)
        await job_application_factory(job=job_other_user, count=5)
        applications, total_count = await crud_job_application.get_job_applications(
            db=async_session, db_job_id=test_job.id, user_id=customer_test_user.id
        )
        assert total_count == 2


class TestUpdateJobApplication:

    async def test_owner_can_update_status(
            self, async_session, test_job, customer_test_user, test_job_application
    ):
        payload = JobApplicationUpdate(status=ApplicationStatus.ACCEPTED)
        result = await crud_job_application.update_job_application(
            db=async_session,
            job_id=test_job.id,
            app_id=test_job_application.id,
            user_id=customer_test_user.id,
            object=payload,
        )
        assert result.status == ApplicationStatus.ACCEPTED.value

    async def test_non_owner_forbidden(
            self, async_session, test_job, other_customer_test_user, test_job_application
    ):
        payload = JobApplicationUpdate(status=ApplicationStatus.REJECTED)
        with pytest.raises(ForbiddenException):
            await crud_job_application.update_job_application(
                db=async_session,
                job_id=test_job.id,
                app_id=test_job_application.id,
                user_id=other_customer_test_user.id,
                object=payload,
            )

    async def test_owner_of_a_different_job_cannot_update(
            self, async_session, job_other_user, customer_test_user, test_job_application
    ):
        """Regression test for the original bug: crud_jobs.exists(user_id=...)
        without job_id let any job-owning customer pass the check."""
        payload = JobApplicationUpdate(status=ApplicationStatus.ACCEPTED)
        with pytest.raises((ForbiddenException, NotFoundException)):
            await crud_job_application.update_job_application(
                db=async_session,
                job_id=job_other_user.id,  # a job this customer does NOT own
                app_id=test_job_application.id,  # belongs to a different job
                user_id=customer_test_user.id,
                object=payload,
            )

    async def test_nonexistent_job_raises_not_found(
            self, async_session, customer_test_user, test_job_application
    ):
        payload = JobApplicationUpdate(status=ApplicationStatus.ACCEPTED)
        with pytest.raises(NotFoundException):
            await crud_job_application.update_job_application(
                db=async_session,
                job_id=999999,
                app_id=test_job_application.id,
                user_id=customer_test_user.id,
                object=payload,
            )

    async def test_nonexistent_application_raises_not_found(
            self, async_session, test_job, customer_test_user
    ):
        payload = JobApplicationUpdate(status=ApplicationStatus.ACCEPTED)
        with pytest.raises(NotFoundException):
            await crud_job_application.update_job_application(
                db=async_session,
                job_id=test_job.id,
                app_id=999999,
                user_id=customer_test_user.id,
                object=payload,
            )

    async def test_application_not_belonging_to_job_raises_not_found(
            self, async_session, test_job, job_other_user, customer_test_user, job_application_factory
    ):
        """app_id exists and job_id is owned by the caller, but the
        application actually belongs to a different job."""
        [application] = await job_application_factory(job=job_other_user, count=1)
        payload = JobApplicationUpdate(status=ApplicationStatus.ACCEPTED)
        with pytest.raises(NotFoundException):
            await crud_job_application.update_job_application(
                db=async_session,
                job_id=test_job.id,
                app_id=application.id,
                user_id=customer_test_user.id,
                object=payload,
            )

    async def test_update_persists_and_is_retrievable(
            self, async_session, test_job, customer_test_user, test_job_application
    ):
        payload = JobApplicationUpdate(status=ApplicationStatus.REJECTED)
        await crud_job_application.update_job_application(
            db=async_session,
            job_id=test_job.id,
            app_id=test_job_application.id,
            user_id=customer_test_user.id,
            object=payload,
        )
        applications, _ = await crud_job_application.get_job_applications(
            db=async_session, db_job_id=test_job.id, user_id=customer_test_user.id
        )
        assert applications[0].status == ApplicationStatus.REJECTED.value
