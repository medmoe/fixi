"""
Seed script: reviews table + worker_profiles rating snapshot
Marks a handful of seeded jobs as completed and leaves reviews on them:
every completed job gets a customer -> worker review, and about half also
get the reverse worker -> customer review. Recomputes each reviewed
worker's average_rating/review_count from the resulting rows.

Depends on seed_jobs_and_workers.py already having been run — it reuses
the seed_customer_XX / seed_worker_XX users and jobs created there.

Run with: python -m src.scripts.seed_reviews

IMPORTANT:
if database is running on a docker container.
run the seed script inside Docker "docker compose exec web python -m src.scripts.seed_reviews"

Idempotent: reviews are looked up by (job_id, reviewer_id) — the same
unique constraint enforced at the DB level — so re-running skips anything
that already exists instead of duplicating rows.
"""
import asyncio
import random
from typing import TypedDict

from psycopg2._psycopg import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.database import local_session
from src.app.models import Job, JobStatus, Review, User, UserRole, WorkerProfile, WorkerTrade

# Reuses the seed_customer_XX jobs created by seed_jobs_and_workers.py, in
# the same order as JOB_TEMPLATES there.
JOB_TITLES_TO_REVIEW: list[str] = [
    "Fix leaking kitchen sink",
    "Install ceiling fan",
    "Build custom bookshelf",
    "AC unit not cooling",
    "Repaint living room",
    "Replace bathroom faucet",
]

# First N of the above also get a reverse worker -> customer review.
REVERSE_REVIEW_COUNT = 3


class CommentPool(TypedDict):
    rating: int
    comments: list[str]


CUSTOMER_TO_WORKER_COMMENTS: list[CommentPool] = [
    {"rating": 5, "comments": [
        "Showed up on time and did excellent work. Highly recommend.",
        "Fixed the issue quickly and cleaned up afterward. Very professional.",
    ]},
    {"rating": 4, "comments": [
        "Good work overall, took a bit longer than expected but the result was solid.",
        "Friendly and skilled, would hire again.",
    ]},
    {"rating": 3, "comments": [
        "Job got done but communication could have been better.",
    ]},
]

WORKER_TO_CUSTOMER_COMMENTS: list[CommentPool] = [
    {"rating": 5, "comments": [
        "Clear instructions and paid promptly. Great customer to work with.",
        "Easy to work with, gave access to the site right on schedule.",
    ]},
    {"rating": 4, "comments": [
        "Reasonable expectations, minor delay getting payment sorted.",
    ]},
]


def pick_rating_and_comment(pool: list[CommentPool]) -> tuple[int, str]:
    entry = random.choice(pool)
    return entry["rating"], random.choice(entry["comments"])


async def get_matching_worker(db: AsyncSession, job: Job, offset: int) -> WorkerProfile | None:
    """Deterministically picks a worker whose trade matches the job's, varying
    by offset so different jobs don't all land on the same worker."""
    result = await db.execute(
        select(WorkerProfile)
        .join(WorkerTrade, WorkerTrade.worker_profile_id == WorkerProfile.id)
        .where(WorkerTrade.trade_category_id == job.trade_category_id)
        .order_by(WorkerProfile.id)
    )
    candidates = result.scalars().all()
    if not candidates:
        return None
    return candidates[offset % len(candidates)]


async def get_or_create_review(
        db: AsyncSession, job: Job, reviewer_id: int, reviewee_id: int, role: UserRole, pool: list[CommentPool]
) -> Review | None:
    existing = await db.scalar(
        select(Review).where(Review.job_id == job.id, Review.reviewer_id == reviewer_id)
    )
    if existing:
        return None

    rating, comment = pick_rating_and_comment(pool)
    review = Review(
        job_id=job.id,
        reviewer_id=reviewer_id,
        reviewee_id=reviewee_id,
        role=role,
        rating=rating,
        comment=comment,
    )
    db.add(review)
    return review


async def seed_reviews(db: AsyncSession) -> list[Review]:
    created: list[Review] = []

    for i, title in enumerate(JOB_TITLES_TO_REVIEW, start=1):
        customer_username = f"seed_customer_{i:02d}"
        customer = await db.scalar(select(User).where(User.username == customer_username))
        if customer is None:
            raise RuntimeError(f"Missing seeded user '{customer_username}'. Run seed_jobs_and_workers.py first.")

        job = await db.scalar(select(Job).where(Job.user_id == customer.id, Job.title == title))
        if job is None:
            raise RuntimeError(f"Missing seeded job '{title}'. Run seed_jobs_and_workers.py first.")

        worker = await get_matching_worker(db, job, offset=i)
        if worker is None:
            continue

        if job.status != JobStatus.COMPLETED:
            job.status = JobStatus.COMPLETED

        review = await get_or_create_review(
            db, job, reviewer_id=customer.id, reviewee_id=worker.user_id,
            role=UserRole.CUSTOMER, pool=CUSTOMER_TO_WORKER_COMMENTS,
        )
        if review:
            created.append(review)

        if i <= REVERSE_REVIEW_COUNT:
            reverse_review = await get_or_create_review(
                db, job, reviewer_id=worker.user_id, reviewee_id=customer.id,
                role=UserRole.WORKER, pool=WORKER_TO_CUSTOMER_COMMENTS,
            )
            if reverse_review:
                created.append(reverse_review)

    await db.flush()
    return created


async def recompute_worker_ratings(db: AsyncSession, reviews: list[Review]) -> int:
    """Recomputes average_rating/review_count for every worker who received a
    customer review among the ones just seeded — mirrors the aggregation the
    application will eventually run on each new review."""
    reviewee_ids = {r.reviewee_id for r in reviews if r.role == UserRole.CUSTOMER}
    updated = 0

    for user_id in reviewee_ids:
        worker_profile = await db.scalar(select(WorkerProfile).where(WorkerProfile.user_id == user_id))
        if worker_profile is None:
            continue

        result = await db.execute(
            select(Review.rating).where(Review.reviewee_id == user_id, Review.role == UserRole.CUSTOMER)
        )
        ratings = result.scalars().all()
        if not ratings:
            continue

        worker_profile.review_count = len(ratings)
        worker_profile.average_rating = Decimal(round(sum(ratings) / len(ratings), 2))
        updated += 1

    await db.flush()
    return updated


async def main_seed(db: AsyncSession) -> None:
    reviews = await seed_reviews(db)
    updated_profiles = await recompute_worker_ratings(db, reviews)

    await db.commit()

    print(f"✅ Seeded {len(reviews)} reviews across {len(JOB_TITLES_TO_REVIEW)} completed jobs.")
    print(f"✅ Updated average_rating/review_count on {updated_profiles} worker profiles.")


async def main() -> None:
    async with local_session() as db:
        await main_seed(db)


if __name__ == "__main__":
    asyncio.run(main())
