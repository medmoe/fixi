from decimal import Decimal

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import Job, UserRole, User, TradeCategory
from src.app.schemas.user import UserReadInternal


async def bulk_job_create(db: AsyncSession, parameters: list[dict]) -> None:
    await db.execute(insert(Job), parameters)
    await db.commit()


def create_user_read_internal_schema() -> UserReadInternal:
    return UserReadInternal(
        username="customer_test_user_username",
        email="customer@test.com",
        role_type=UserRole.CUSTOMER,
        token_version=1
    )


async def create_test_job(async_session: AsyncSession, test_trade_category: TradeCategory, test_user: User) -> Job:
    job = Job(
        title="Fix Leaking Kitchen Sink",
        description="Kitchen sink has been leaking under the cabinet for two days.",
        trade_category_id=test_trade_category.id,
        user_id=test_user.id,
        budget_min=Decimal("75.00"),
        budget_max=Decimal("200.00"),
        display_location="New York, NY",
        location="POINT(0 0)"
    )
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job
