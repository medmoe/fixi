"""created PortfolioImage schema

Revision ID: c84eb11eab31
Revises: 862f3e350470
Create Date: 2026-07-05 22:21:14.165554+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c84eb11eab31'
down_revision: Union[str, None] = '862f3e350470'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'portfolio_images',
        sa.Column('id', sa.Integer, autoincrement=True, nullable=False),
        sa.Column('worker_profile_id', sa.Integer, nullable=False),
        sa.Column('image_url', sa.String(length=255), nullable=False),
        # TimestampMixin fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP(0)"), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text("CURRENT_TIMESTAMP(0)"), nullable=True),
        # Constraints and keys
        sa.ForeignKeyConstraint(['worker_profile_id'], ['worker_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f("ix_portfolio_images_worker_profile_id"),
        "portfolio_images",
        ["worker_profile_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_portfolio_images_worker_profile_id"), table_name="portfolio_images")
    op.drop_table("portfolio_images")
