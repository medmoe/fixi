"""add worker profile fields and category link

Revision ID: c1d4e8a9b672
Revises: b7e2c9d8a1f0
Create Date: 2026-02-13 02:00:00.000000+00:00

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d4e8a9b672"
down_revision: Union[str, None] = "b7e2c9d8a1f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "worker" not in table_names:
        return

    worker_columns = {col["name"] for col in inspector.get_columns("worker")}
    with op.batch_alter_table("worker", schema=None) as batch_op:
        if "service_category_id" not in worker_columns:
            batch_op.add_column(sa.Column("service_category_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_worker_service_category_id_service_category",
                "service_category",
                ["service_category_id"],
                ["id"],
            )
        if "skills" not in worker_columns:
            batch_op.add_column(sa.Column("skills", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")))
        if "portfolio_image_urls" not in worker_columns:
            batch_op.add_column(
                sa.Column("portfolio_image_urls", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json"))
            )

    inspector = sa.inspect(bind)
    index_names = {idx["name"] for idx in inspector.get_indexes("worker")}
    if op.f("ix_worker_service_category_id") not in index_names:
        op.create_index(op.f("ix_worker_service_category_id"), "worker", ["service_category_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "worker" not in table_names:
        return

    index_names = {idx["name"] for idx in inspector.get_indexes("worker")}
    if op.f("ix_worker_service_category_id") in index_names:
        op.drop_index(op.f("ix_worker_service_category_id"), table_name="worker")

    worker_columns = {col["name"] for col in inspector.get_columns("worker")}
    fk_names = {fk["name"] for fk in inspector.get_foreign_keys("worker") if fk.get("name")}
    with op.batch_alter_table("worker", schema=None) as batch_op:
        if "service_category_id" in worker_columns:
            if "fk_worker_service_category_id_service_category" in fk_names:
                batch_op.drop_constraint("fk_worker_service_category_id_service_category", type_="foreignkey")
            batch_op.drop_column("service_category_id")
        if "portfolio_image_urls" in worker_columns:
            batch_op.drop_column("portfolio_image_urls")
        if "skills" in worker_columns:
            batch_op.drop_column("skills")
