"""
Seed script: jobs, job applications, worker locations
Populates 20 workers across 3 cities, 10 customers with open jobs, and
5 pending job applications.

Depends on trade_categories already being seeded — run
seed_trade_category.py first.

Run with: python -m src.scripts.seed_jobs_and_workers

IMPORTANT:
if database is running on a docker container.
run the seed script inside Docker "docker compose exec web python -m src.scripts.seed_jobs_and_workers"

Idempotent: every seeded row uses a deterministic username
(seed_worker_01, seed_customer_01, ...) so re-running skips anything that
already exists instead of duplicating rows.
"""
import asyncio
import random
from decimal import Decimal
from typing import TypedDict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.core.security import get_password_hash
from src.app.models import (
    ApplicationStatus,
    Job,
    JobApplication,
    JobStatus,
    SkillLevel,
    TradeCategory,
    User,
    UserRole,
    WorkerProfile,
    WorkerTrade,
)

SEED_PASSWORD = "SeedPassword123!"  # dev/demo only — never used for real login


class JobTemplate(TypedDict):
    title: str
    description: str
    trade_name: str


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

# WKT: POINT(lon lat) — a handful of scattered points per city
CITIES: dict[str, list[str]] = {
    "Algiers": [
        "POINT(3.0588 36.7538)",
        "POINT(3.0420 36.7631)",
        "POINT(3.0871 36.7213)",
        "POINT(3.1146 36.7458)",
        "POINT(2.9950 36.7889)",
        "POINT(3.0693 36.7025)",
        "POINT(3.0219 36.7654)",
    ],
    "Oran": [
        "POINT(-0.6337 35.6971)",
        "POINT(-0.6558 35.7089)",
        "POINT(-0.6120 35.6845)",
        "POINT(-0.6789 35.7234)",
        "POINT(-0.6012 35.6678)",
        "POINT(-0.6445 35.7401)",
    ],
    "Constantine": [
        "POINT(6.6147 36.3650)",
        "POINT(6.6280 36.3722)",
        "POINT(6.5989 36.3541)",
        "POINT(6.6412 36.3805)",
        "POINT(6.6055 36.3489)",
        "POINT(6.6301 36.3618)",
        "POINT(6.5878 36.3712)",
    ],
}

# uses the same top-level trade names already created by seed_trade_category.py
JOB_TEMPLATES: list[JobTemplate] = [
    {"title": "Fix leaking kitchen sink", "description": "Pipe under the cabinet has been leaking for two days.", "trade_name": "plumber"},
    {"title": "Install ceiling fan", "description": "Need a ceiling fan installed in the living room.", "trade_name": "electrician"},
    {"title": "Build custom bookshelf", "description": "Looking for a carpenter to build a floor-to-ceiling bookshelf.", "trade_name": "carpenter"},
    {"title": "AC unit not cooling", "description": "Central AC blowing warm air, needs inspection and repair.", "trade_name": "hvac"},
    {"title": "Repaint living room", "description": "Need two coats of paint on a 20sqm living room.", "trade_name": "painter"},
    {"title": "Replace bathroom faucet", "description": "Old faucet is corroded and needs replacement.", "trade_name": "plumber"},
    {"title": "Rewire old apartment", "description": "Apartment wiring is outdated, needs full inspection and rewiring.", "trade_name": "electrician"},
    {"title": "Repair wooden deck", "description": "Deck boards are warped and need replacing.", "trade_name": "carpenter"},
    {"title": "Install new heating system", "description": "Looking to replace an old boiler with a modern heating system.", "trade_name": "hvac"},
    {"title": "Exterior wall painting", "description": "Need the exterior of a two-story house repainted.", "trade_name": "painter"},
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def get_trade_categories(db: AsyncSession) -> dict[str, TradeCategory]:
    """Fetches the top-level trade categories seeded by seed_trade_category.py.
    Does NOT create them here — this script depends on that one having run first."""
    result = await db.execute(select(TradeCategory).where(TradeCategory.parent_id.is_(None)))
    categories = {category.name: category for category in result.scalars().all()}
    missing = {t["trade_name"] for t in JOB_TEMPLATES} - categories.keys()
    if missing:
        raise RuntimeError(
            f"Missing trade categories: {missing}. Run seed_trade_category.py first."
        )
    return categories


async def get_or_create_user(db: AsyncSession, username: str, name: str, role: UserRole) -> User:
    existing = await db.scalar(select(User).where(User.username == username))
    if existing:
        return existing
    user = User(
        name=name,
        username=username,
        email=f"{username}@seed.local",
        hashed_password=get_password_hash(SEED_PASSWORD),
        role_type=role,
        is_superuser=False,
        is_deleted=False,
        token_version=1,
    )
    db.add(user)
    await db.flush()
    return user


async def seed_workers(db: AsyncSession, trade_categories: dict[str, TradeCategory]) -> list[WorkerProfile]:
    """20 workers spread across 3 cities with varied rate/radius/availability."""
    all_locations = [(city, loc) for city, locs in CITIES.items() for loc in locs]
    trade_names = list(trade_categories.keys())
    worker_profiles: list[WorkerProfile] = []

    for i in range(1, 21):
        username = f"seed_worker_{i:02d}"
        city, location = all_locations[(i - 1) % len(all_locations)]
        user = await get_or_create_user(db, username, f"Worker {i:02d} ({city})", UserRole.WORKER)

        if user.location != location:
            user.location = location
            user.display_location = f"{city}, Algeria"

        existing_profile = await db.scalar(
            select(WorkerProfile).where(WorkerProfile.user_id == user.id)
        )
        if existing_profile:
            worker_profiles.append(existing_profile)
            continue

        profile = WorkerProfile(
            user_id=user.id,
            bio=f"Experienced tradesperson based in {city}.",
            hourly_rate=Decimal(random.choice([500, 800, 1200, 1500, 2000, 2500])),
            years_of_experience=random.randint(1, 15),
            service_radius_km=random.choice([5, 10, 15, 20, 30, 50]),
            is_available=random.random() > 0.25,  # ~75% available
            is_verified=random.random() > 0.5,
        )
        db.add(profile)
        await db.flush()

        trade_name = trade_names[(i - 1) % len(trade_names)]
        worker_trade = WorkerTrade(
            worker_profile_id=profile.id,
            trade_category_id=trade_categories[trade_name].id,
            skill_level=random.choice(list(SkillLevel)),
        )
        db.add(worker_trade)

        worker_profiles.append(profile)

    await db.flush()
    return worker_profiles


async def seed_jobs(db: AsyncSession, trade_categories: dict[str, TradeCategory]) -> list[Job]:
    """10 open jobs, one customer each, spread across trade categories."""
    jobs: list[Job] = []
    cities = list(CITIES.items())

    for i, template in enumerate(JOB_TEMPLATES, start=1):
        username = f"seed_customer_{i:02d}"
        city, locations = cities[(i - 1) % len(cities)]
        customer = await get_or_create_user(db, username, f"Customer {i:02d}", UserRole.CUSTOMER)

        existing_job = await db.scalar(
            select(Job).where(Job.user_id == customer.id, Job.title == template["title"])
        )
        if existing_job:
            jobs.append(existing_job)
            continue

        job = Job(
            title=template["title"],
            description=template["description"],
            trade_category_id=trade_categories[template["trade_name"]].id,
            user_id=customer.id,
            budget_min=Decimal(random.choice([2000, 3000, 5000])),
            budget_max=Decimal(random.choice([8000, 12000, 20000])),
            display_location=f"{city}, Algeria",
            location=locations[0],
            status=JobStatus.OPEN,
        )
        db.add(job)
        jobs.append(job)

    await db.flush()
    return jobs


async def seed_applications(db: AsyncSession, workers: list[WorkerProfile], jobs: list[Job]) -> int:
    """5 workers with a pending application each, matched by shared trade category."""
    applicants = workers[:5]  # first 5 seeded workers — deterministic, not random
    created_count = 0

    for worker in applicants:
        worker_trade = await db.scalar(
            select(WorkerTrade).where(WorkerTrade.worker_profile_id == worker.id)
        )
        if worker_trade is None:
            continue

        matching_job = next(
            (job for job in jobs if job.trade_category_id == worker_trade.trade_category_id), None
        )
        if matching_job is None:
            continue

        existing = await db.scalar(
            select(JobApplication).where(
                JobApplication.job_id == matching_job.id,
                JobApplication.worker_profile_id == worker.id,
            )
        )
        if existing:
            continue

        application = JobApplication(
            job_id=matching_job.id,
            worker_profile_id=worker.id,
            message="I'd love to help with this job — available to start right away.",
            status=ApplicationStatus.PENDING,
        )
        db.add(application)
        created_count += 1

    await db.flush()
    return created_count


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def seed_jobs_and_workers(db: AsyncSession) -> None:
    trade_categories = await get_trade_categories(db)
    workers = await seed_workers(db, trade_categories)
    jobs = await seed_jobs(db, trade_categories)
    applications_created = await seed_applications(db, workers, jobs)

    await db.commit()

    print(f"✅ Seeded {len(workers)} workers across {len(CITIES)} cities.")
    print(f"✅ Seeded {len(jobs)} open jobs.")
    print(f"✅ Seeded {applications_created} pending job applications.")


async def main() -> None:
    async with local_session() as db:
        await seed_jobs_and_workers(db)


if __name__ == "__main__":
    asyncio.run(main())