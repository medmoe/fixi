from arq import cron
from arq.connections import RedisSettings

from ...core.config import settings
from .functions import check_job_timeouts, sample_background_task, shutdown, startup

REDIS_QUEUE_HOST = settings.REDIS_QUEUE_HOST
REDIS_QUEUE_PORT = settings.REDIS_QUEUE_PORT


class WorkerSettings:
    functions = [sample_background_task]
    cron_jobs = [cron(check_job_timeouts, minute=0)]  # hourly -- fine-grained enough for a 24h timeout window
    redis_settings = RedisSettings(host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT)
    on_startup = startup
    on_shutdown = shutdown
    handle_signals = False
