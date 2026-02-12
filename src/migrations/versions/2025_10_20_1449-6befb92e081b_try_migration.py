"""try migration

Revision ID: 6befb92e081b
Revises: Create Date: 2025-10-20 14:49:39.148079+00:00

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6befb92e081b'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tier",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=30), nullable=False),
        sa.Column("username", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=50), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("profile_image_url", sa.String(), nullable=False, server_default="https://profileimageurl.com"),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("tier_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["tier_id"], ["tier.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)
    op.create_index(op.f("ix_user_username"), "user", ["username"], unique=True)
    op.create_index(op.f("ix_user_is_deleted"), "user", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_user_tier_id"), "user", ["tier_id"], unique=False)

    op.create_table(
        "token_blacklist",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(op.f("ix_token_blacklist_token"), "token_blacklist", ["token"], unique=True)

    op.create_table(
        "post",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=30), nullable=False),
        sa.Column("text", sa.String(length=63206), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("media_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_post_created_by_user_id"), "post", ["created_by_user_id"], unique=False)
    op.create_index(op.f("ix_post_is_deleted"), "post", ["is_deleted"], unique=False)

    op.create_table(
        "files",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("belongs_to_user_id", sa.Integer(), nullable=False),
        sa.Column("file_key", sa.String(length=255), nullable=False),
        sa.Column("original_file_name", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=255), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_processed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_safe", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("exif_stripped", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["belongs_to_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_key"),
        sa.UniqueConstraint("id"),
    )
    op.create_index(op.f("ix_files_id"), "files", ["id"], unique=False)
    op.create_index(op.f("ix_files_belongs_to_user_id"), "files", ["belongs_to_user_id"], unique=False)
    op.create_index(op.f("ix_files_file_key"), "files", ["file_key"], unique=True)

    op.create_table(
        "rate_limit",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tier_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("path", sa.String(), nullable=False),
        sa.Column("limit", sa.Integer(), nullable=False),
        sa.Column("period", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["tier_id"], ["tier.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_rate_limit_tier_id"), "rate_limit", ["tier_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_rate_limit_tier_id"), table_name="rate_limit")
    op.drop_table("rate_limit")

    op.drop_index(op.f("ix_files_file_key"), table_name="files")
    op.drop_index(op.f("ix_files_belongs_to_user_id"), table_name="files")
    op.drop_index(op.f("ix_files_id"), table_name="files")
    op.drop_table("files")

    op.drop_index(op.f("ix_post_is_deleted"), table_name="post")
    op.drop_index(op.f("ix_post_created_by_user_id"), table_name="post")
    op.drop_table("post")

    op.drop_index(op.f("ix_token_blacklist_token"), table_name="token_blacklist")
    op.drop_table("token_blacklist")

    op.drop_index(op.f("ix_user_tier_id"), table_name="user")
    op.drop_index(op.f("ix_user_is_deleted"), table_name="user")
    op.drop_index(op.f("ix_user_username"), table_name="user")
    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.drop_table("user")

    op.drop_table("tier")
