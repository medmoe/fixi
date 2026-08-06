from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import Job


async def bulk_job_create(db: AsyncSession, parameters: list[dict]) -> None:
    await db.execute(insert(Job), parameters)
    await db.commit()
