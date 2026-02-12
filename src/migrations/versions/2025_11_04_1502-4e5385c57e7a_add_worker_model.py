"""add worker model

Revision ID: 4e5385c57e7a
Revises: 62df2f1deca5
Create Date: 2025-11-04 15:02:52.264174+00:00

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4e5385c57e7a'
down_revision: Union[str, None] = '62df2f1deca5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "worker" not in table_names:
        op.create_table(
            "worker",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("profession", sa.String(length=255), nullable=False),
            sa.Column("hourly_rate", sa.Float(), nullable=False),
            sa.Column("years_of_experience", sa.Integer(), nullable=True),
            sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("bio", sa.String(length=500), nullable=True),
            sa.Column("availability_status", sa.String(length=50), nullable=False, server_default="available"),
            sa.Column("average_rating", sa.Float(), nullable=True),
            sa.Column("total_rating", sa.Integer(), nullable=False, server_default="0"),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("id"),
            sa.UniqueConstraint("user_id"),
        )

    inspector = sa.inspect(bind)
    index_names = {idx["name"] for idx in inspector.get_indexes("worker")}
    if op.f("ix_worker_user_id") not in index_names:
        op.create_index(op.f("ix_worker_user_id"), "worker", ["user_id"], unique=False)
    if op.f("ix_worker_average_rating") not in index_names:
        op.create_index(op.f("ix_worker_average_rating"), "worker", ["average_rating"], unique=False)
    if op.f("ix_worker_total_rating") not in index_names:
        op.create_index(op.f("ix_worker_total_rating"), "worker", ["total_rating"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "worker" not in table_names:
        return

    index_names = {idx["name"] for idx in inspector.get_indexes("worker")}
    if op.f("ix_worker_total_rating") in index_names:
        op.drop_index(op.f("ix_worker_total_rating"), table_name="worker")
    if op.f("ix_worker_average_rating") in index_names:
        op.drop_index(op.f("ix_worker_average_rating"), table_name="worker")
    if op.f("ix_worker_user_id") in index_names:
        op.drop_index(op.f("ix_worker_user_id"), table_name="worker")

    op.drop_table("worker")
