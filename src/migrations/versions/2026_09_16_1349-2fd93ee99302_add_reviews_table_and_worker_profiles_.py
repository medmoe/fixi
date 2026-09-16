"""add reviews table and worker_profiles rating snapshot columns

Revision ID: 2fd93ee99302
Revises:
Create Date: 2026-09-16 13:49:32.404571+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2fd93ee99302'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), nullable=False),
        sa.Column('reviewee_id', sa.Integer(), nullable=False),
        sa.Column('role', postgresql.ENUM('customer', 'worker', name='userrole', create_type=False), nullable=False),
        sa.Column('rating', sa.SmallInteger(), nullable=False),
        sa.Column('comment', sa.String(length=1000), nullable=True),
        sa.Column('is_flagged', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=True),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='check_review_rating_range'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewee_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id', 'reviewer_id', name='unique_job_reviewer'),
    )
    op.create_index(op.f('ix_reviews_job_id'), 'reviews', ['job_id'], unique=False)
    op.create_index(op.f('ix_reviews_reviewee_id'), 'reviews', ['reviewee_id'], unique=False)
    op.create_index(op.f('ix_reviews_reviewer_id'), 'reviews', ['reviewer_id'], unique=False)

    op.add_column('worker_profiles', sa.Column('average_rating', sa.Numeric(precision=3, scale=2), nullable=True))
    op.add_column('worker_profiles', sa.Column('review_count', sa.Integer(), nullable=False, server_default='0'))
    op.alter_column('worker_profiles', 'review_count', server_default=None)


def downgrade() -> None:
    op.drop_column('worker_profiles', 'review_count')
    op.drop_column('worker_profiles', 'average_rating')

    op.drop_index(op.f('ix_reviews_reviewer_id'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_reviewee_id'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_job_id'), table_name='reviews')
    op.drop_table('reviews')
