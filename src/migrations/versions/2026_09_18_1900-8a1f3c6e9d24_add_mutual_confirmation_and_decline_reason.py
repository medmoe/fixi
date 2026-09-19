"""add mutual confirmation timestamps, decline reason, and no-show counters

Revision ID: 8a1f3c6e9d24
Revises: 2fd93ee99302
Create Date: 2026-09-18 19:00:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8a1f3c6e9d24'
down_revision: Union[str, None] = '2fd93ee99302'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_decline_reason_enum = postgresql.ENUM(
    'price_disagreement', 'schedule_conflict', 'scope_mismatch', 'worker_unavailable',
    'unresponsive', 'another_applicant_selected', 'other',
    name='applicationdeclinereason',
)


def upgrade() -> None:
    op.add_column('jobs', sa.Column('customer_marked_complete_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('jobs', sa.Column('worker_marked_complete_at', sa.DateTime(timezone=True), nullable=True))

    op.add_column('job_applications', sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('job_applications', sa.Column('worker_confirmed_at', sa.DateTime(timezone=True), nullable=True))
    _decline_reason_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'job_applications',
        sa.Column('decline_reason', postgresql.ENUM(name='applicationdeclinereason', create_type=False), nullable=True),
    )

    op.add_column('worker_profiles', sa.Column('no_show_count', sa.Integer(), nullable=False, server_default='0'))
    op.alter_column('worker_profiles', 'no_show_count', server_default=None)

    op.add_column('customer_profiles', sa.Column('no_show_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('customer_profiles', 'no_show_count')
    op.drop_column('worker_profiles', 'no_show_count')

    op.drop_column('job_applications', 'decline_reason')
    op.drop_column('job_applications', 'worker_confirmed_at')
    op.drop_column('job_applications', 'accepted_at')

    op.drop_column('jobs', 'worker_marked_complete_at')
    op.drop_column('jobs', 'customer_marked_complete_at')

    _decline_reason_enum.drop(op.get_bind(), checkfirst=True)
