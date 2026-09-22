import asyncio
import logging

import uvloop
from arq.worker import Worker

from ...services.job_timeout_service import run_job_timeout_checks
from ...services.notification_monitoring import check_sms_otp_failure_rate_and_alert
from ..db.database import local_session

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


# -------- background tasks --------
async def sample_background_task(ctx: Worker, name: str) -> str:
    await asyncio.sleep(5)
    return f"Task {name} is complete!"


async def check_job_timeouts(ctx: dict) -> dict[str, int]:
    """Hourly cron -- expires unconfirmed assignments/completions past
    settings.JOB_LIFECYCLE_TIMEOUT_HOURS. Opens its own session since arq
    workers run outside FastAPI's request-scoped dependency injection.

    ctx is typed dict (not Worker, unlike sample_background_task above) --
    arq.typing.WorkerCoroutine's Protocol expects Dict[Any, Any], and passing
    this function directly to cron() type-checks against that Protocol."""
    async with local_session() as db:
        result = await run_job_timeout_checks(db)
        logging.info("Job timeout check: %s", result)
        return result


async def check_otp_delivery_health(ctx: dict) -> dict:
    """Every-15-minutes cron (Issue 7) -- pages the admin alert channel if
    the SMS OTP failure rate over the trailing window crosses
    OTP_ALERT_FAILURE_RATE_THRESHOLD. OTP blocks login, so this is the one
    notification channel that gets an active alert rather than just the
    queryable GET /notifications/stats dashboard."""
    async with local_session() as db:
        result = await check_sms_otp_failure_rate_and_alert(db)
        if result.triggered:
            logging.warning("OTP delivery health check: %s", result)
        else:
            logging.info("OTP delivery health check: %s", result)
        return {
            "sample_size": result.sample_size,
            "failure_rate": result.failure_rate,
            "triggered": result.triggered,
            "alert_sent": result.alert_sent,
            "suppressed_by_cooldown": result.suppressed_by_cooldown,
        }


# -------- base functions --------
async def startup(ctx: Worker) -> None:
    logging.info("Worker Started")


async def shutdown(ctx: Worker) -> None:
    logging.info("Worker end")
