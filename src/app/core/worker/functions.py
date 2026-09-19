import asyncio
import logging

import uvloop
from arq.worker import Worker

from ...services.job_timeout_service import run_job_timeout_checks
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


# -------- base functions --------
async def startup(ctx: Worker) -> None:
    logging.info("Worker Started")


async def shutdown(ctx: Worker) -> None:
    logging.info("Worker end")
