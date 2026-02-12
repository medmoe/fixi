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

    role_enum = sa.Enum("customer", "handyman", name="user_role_type")
    role_enum.create(bind, checkfirst=True)

    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "role_type",
                role_enum,
                nullable=False,
                server_default="customer",
            )
        )
        batch_op.add_column(sa.Column("token_version", sa.Integer(), nullable=False, server_default="1"))
        batch_op.create_index(batch_op.f("ix_user_role_type"), ["role_type"], unique=False)

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
    op.create_index(op.f("ix_customer_profile_user_id"), "customer_profile", ["user_id"], unique=False)

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
    op.create_index(op.f("ix_handyman_profile_user_id"), "handyman_profile", ["user_id"], unique=False)

    if "worker" in inspector.get_table_names():
        op.execute("UPDATE \"user\" SET role_type = 'handyman' WHERE id IN (SELECT user_id FROM worker)")

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
        WHERE u.role_type = 'customer'
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

    role_enum = sa.Enum("customer", "handyman", name="user_role_type")
    role_enum.drop(op.get_bind(), checkfirst=True)
