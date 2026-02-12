"""add marketplace models (services, jobs, reviews, user profile fields)

Revision ID: a3c9d1e2f4b7
Revises: 9f2a7c1d4b21
Create Date: 2026-02-12 17:30:00.000000+00:00

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3c9d1e2f4b7"
down_revision: Union[str, None] = "9f2a7c1d4b21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    user_columns = {col["name"] for col in inspector.get_columns("user")} if "user" in table_names else set()
    with op.batch_alter_table("user", schema=None) as batch_op:
        if "bio" not in user_columns:
            batch_op.add_column(sa.Column("bio", sa.String(length=500), nullable=True))
        if "location" not in user_columns:
            batch_op.add_column(sa.Column("location", sa.String(length=100), nullable=True))

    if "service_category" not in table_names:
        op.create_table(
            "service_category",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("description", sa.String(length=500), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("id"),
            sa.UniqueConstraint("name"),
        )
    inspector = sa.inspect(bind)
    service_indexes = {idx["name"] for idx in inspector.get_indexes("service_category")}
    if op.f("ix_service_category_name") not in service_indexes:
        op.create_index(op.f("ix_service_category_name"), "service_category", ["name"], unique=True)

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status_type') THEN
                CREATE TYPE job_status_type AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
            END IF;
        END
        $$;
        """
    )
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "job" not in table_names:
        op.create_table(
            "job",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("service_category_id", sa.Integer(), nullable=True),
            sa.Column("customer_id", sa.Integer(), nullable=False),
            sa.Column("worker_id", sa.Integer(), nullable=True),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("description", sa.String(length=4000), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="OPEN"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["service_category_id"], ["service_category.id"]),
            sa.ForeignKeyConstraint(["customer_id"], ["user.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["worker_id"], ["user.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("id"),
        )
        op.execute(
            """
            ALTER TABLE job
            ALTER COLUMN status DROP DEFAULT
            """
        )
        op.execute(
            """
            UPDATE job
            SET status = CASE lower(status)
                WHEN 'open' THEN 'OPEN'
                WHEN 'assigned' THEN 'ASSIGNED'
                WHEN 'in_progress' THEN 'IN_PROGRESS'
                WHEN 'completed' THEN 'COMPLETED'
                WHEN 'cancelled' THEN 'CANCELLED'
                ELSE 'OPEN'
            END
            WHERE status IS NOT NULL
            """
        )
        op.execute(
            """
            ALTER TABLE job
            ALTER COLUMN status TYPE job_status_type
            USING status::job_status_type
            """
        )
        op.execute(
            """
            ALTER TABLE job
            ALTER COLUMN status SET DEFAULT 'OPEN'::job_status_type
            """
        )

    inspector = sa.inspect(bind)
    job_indexes = {idx["name"] for idx in inspector.get_indexes("job")}
    if op.f("ix_job_service_category_id") not in job_indexes:
        op.create_index(op.f("ix_job_service_category_id"), "job", ["service_category_id"], unique=False)
    if op.f("ix_job_customer_id") not in job_indexes:
        op.create_index(op.f("ix_job_customer_id"), "job", ["customer_id"], unique=False)
    if op.f("ix_job_worker_id") not in job_indexes:
        op.create_index(op.f("ix_job_worker_id"), "job", ["worker_id"], unique=False)
    if op.f("ix_job_status") not in job_indexes:
        op.create_index(op.f("ix_job_status"), "job", ["status"], unique=False)

    inspector = sa.inspect(bind)
    if "review" not in set(inspector.get_table_names()):
        op.create_table(
            "review",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("job_id", sa.Integer(), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("comment", sa.String(length=1000), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),
            sa.ForeignKeyConstraint(["job_id"], ["job.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("id"),
            sa.UniqueConstraint("job_id"),
        )
    inspector = sa.inspect(bind)
    review_indexes = {idx["name"] for idx in inspector.get_indexes("review")}
    if op.f("ix_review_job_id") not in review_indexes:
        op.create_index(op.f("ix_review_job_id"), "review", ["job_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "review" in table_names:
        review_indexes = {idx["name"] for idx in inspector.get_indexes("review")}
        if op.f("ix_review_job_id") in review_indexes:
            op.drop_index(op.f("ix_review_job_id"), table_name="review")
        op.drop_table("review")

    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "job" in table_names:
        job_indexes = {idx["name"] for idx in inspector.get_indexes("job")}
        if op.f("ix_job_status") in job_indexes:
            op.drop_index(op.f("ix_job_status"), table_name="job")
        if op.f("ix_job_worker_id") in job_indexes:
            op.drop_index(op.f("ix_job_worker_id"), table_name="job")
        if op.f("ix_job_customer_id") in job_indexes:
            op.drop_index(op.f("ix_job_customer_id"), table_name="job")
        if op.f("ix_job_service_category_id") in job_indexes:
            op.drop_index(op.f("ix_job_service_category_id"), table_name="job")
        op.drop_table("job")

    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "service_category" in table_names:
        service_indexes = {idx["name"] for idx in inspector.get_indexes("service_category")}
        if op.f("ix_service_category_name") in service_indexes:
            op.drop_index(op.f("ix_service_category_name"), table_name="service_category")
        op.drop_table("service_category")

    with op.batch_alter_table("user", schema=None) as batch_op:
        user_columns = {col["name"] for col in sa.inspect(bind).get_columns("user")}
        if "location" in user_columns:
            batch_op.drop_column("location")
        if "bio" in user_columns:
            batch_op.drop_column("bio")

    op.execute("DROP TYPE IF EXISTS job_status_type")
