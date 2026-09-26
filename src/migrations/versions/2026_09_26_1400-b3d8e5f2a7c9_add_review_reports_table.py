"""add review_reports table

Revision ID: b3d8e5f2a7c9
Revises: a2c7f4e9b6d1
Create Date: 2026-09-26 14:00:00+00:00

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b3d8e5f2a7c9'
down_revision: Union[str, None] = 'a2c7f4e9b6d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'review_reports',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('reporter_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=True),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('review_id', 'reporter_id', name='unique_review_reporter'),
    )
    op.create_index(op.f('ix_review_reports_review_id'), 'review_reports', ['review_id'], unique=False)
    op.create_index(op.f('ix_review_reports_reporter_id'), 'review_reports', ['reporter_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_review_reports_reporter_id'), table_name='review_reports')
    op.drop_index(op.f('ix_review_reports_review_id'), table_name='review_reports')
    op.drop_table('review_reports')
