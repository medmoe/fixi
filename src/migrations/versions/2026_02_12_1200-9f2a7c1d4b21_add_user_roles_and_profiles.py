"""add user roles and profile tables

Revision ID: 9f2a7c1d4b21
Revises: 4e5385c57e7a
Create Date: 2026-02-12 12:00:00.000000+00:00

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9f2a7c1d4b21"
down_revision: Union[str, None] = "4e5385c57e7a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    def has_column(table: str, column: str) -> bool:
        return any(col["name"] == column for col in inspector.get_columns(table))

    def has_index(table: str, index_name: str) -> bool:
        return any(idx["name"] == index_name for idx in inspector.get_indexes(table))

    role_enum = sa.Enum("CUSTOMER", "HANDYMAN", name="user_role_type")
    role_enum.create(bind, checkfirst=True)

    with op.batch_alter_table("user", schema=None) as batch_op:
        if not has_column("user", "role_type"):
            batch_op.add_column(
                sa.Column(
                    "role_type",
                    role_enum,
                    nullable=False,
                    server_default="CUSTOMER",
                )
            )
        if not has_column("user", "token_version"):
            batch_op.add_column(sa.Column("token_version", sa.Integer(), nullable=False, server_default="1"))
        user_role_index = batch_op.f("ix_user_role_type")
        if not has_index("user", user_role_index):
            batch_op.create_index(user_role_index, ["role_type"], unique=False)

    if "customer_profile" not in table_names:
        op.create_table(
            "customer_profile",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("saved_addresses", sa.JSON(), nullable=False),
            sa.Column("loyalty_points", sa.Integer(), nullable=False, server_default="0"),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("id"),
            sa.UniqueConstraint("user_id"),
        )
        table_names.add("customer_profile")
    inspector = sa.inspect(bind)
    if not has_index("customer_profile", op.f("ix_customer_profile_user_id")):
        op.create_index(op.f("ix_customer_profile_user_id"), "customer_profile", ["user_id"], unique=False)

    if "handyman_profile" not in table_names:
        op.create_table(
            "handyman_profile",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("skill_category", sa.String(length=120), nullable=False),
            sa.Column("skills", sa.JSON(), nullable=False),
            sa.Column("certification_urls", sa.JSON(), nullable=False),
            sa.Column("hourly_rate", sa.Float(), nullable=False),
            sa.Column("availability", sa.JSON(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("id"),
            sa.UniqueConstraint("user_id"),
        )
        table_names.add("handyman_profile")
    inspector = sa.inspect(bind)
    if not has_index("handyman_profile", op.f("ix_handyman_profile_user_id")):
        op.create_index(op.f("ix_handyman_profile_user_id"), "handyman_profile", ["user_id"], unique=False)

    if "worker" in table_names:
        op.execute("UPDATE \"user\" SET role_type = 'HANDYMAN' WHERE id IN (SELECT user_id FROM worker)")

        op.execute(
            """
            INSERT INTO handyman_profile (
                user_id,
                skill_category,
                skills,
                certification_urls,
                hourly_rate,
                availability
            )
            SELECT
                w.user_id,
                COALESCE(NULLIF(w.profession, ''), 'General'),
                '[]'::json,
                '[]'::json,
                COALESCE(w.hourly_rate, 0),
                json_build_object('status', COALESCE(w.availability_status, 'available'))
            FROM worker w
            ON CONFLICT (user_id) DO NOTHING
            """
        )

    op.execute(
        """
        INSERT INTO customer_profile (user_id, saved_addresses, loyalty_points)
        SELECT u.id, '[]'::json, 0
        FROM "user" u
        WHERE u.role_type = 'CUSTOMER'
        ON CONFLICT (user_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_handyman_profile_user_id"), table_name="handyman_profile")
    op.drop_table("handyman_profile")
    op.drop_index(op.f("ix_customer_profile_user_id"), table_name="customer_profile")
    op.drop_table("customer_profile")

    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_user_role_type"))
        batch_op.drop_column("token_version")
        batch_op.drop_column("role_type")

    role_enum = sa.Enum("CUSTOMER", "HANDYMAN", name="user_role_type")
    role_enum.drop(op.get_bind(), checkfirst=True)
