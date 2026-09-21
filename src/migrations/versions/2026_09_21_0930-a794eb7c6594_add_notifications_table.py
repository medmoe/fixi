"""add notifications table

Revision ID: a794eb7c6594
Revises: 045a8d5c0298
Create Date: 2026-09-21 09:30:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a794eb7c6594'
down_revision: Union[str, None] = '045a8d5c0298'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('title_ar', sa.String(length=255), nullable=False),
        sa.Column('title_fr', sa.String(length=255), nullable=False),
        sa.Column('body_ar', sa.Text(), nullable=False),
        sa.Column('body_fr', sa.Text(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('related_job_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['related_job_id'], ['jobs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index(op.f('ix_notifications_type'), 'notifications', ['type'], unique=False)
    op.create_index(op.f('ix_notifications_read_at'), 'notifications', ['read_at'], unique=False)
    op.create_index(op.f('ix_notifications_related_job_id'), 'notifications', ['related_job_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_related_job_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_read_at'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_type'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')
