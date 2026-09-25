"""add worker_billing table

Revision ID: 986862588eba
Revises: b7dae78d26aa
Create Date: 2026-09-25 16:00:00+00:00

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '986862588eba'
down_revision: Union[str, None] = 'b7dae78d26aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_status_enum = postgresql.ENUM(
    'pending', 'paid', 'overdue',
    name='workerbillingstatus',
)


def upgrade() -> None:
    _status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'worker_billing',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('worker_profile_id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('amount_owed', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('amount_paid', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('status', postgresql.ENUM(name='workerbillingstatus', create_type=False), nullable=False),
        sa.Column('payment_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['worker_profile_id'], ['worker_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_worker_billing_worker_profile_id'), 'worker_billing', ['worker_profile_id'], unique=False)
    # unique=True here, not a separate UniqueConstraint -- matches what
    # `unique=True, index=True` on the model's column actually compiles to
    # (one unique index), not a unique index plus an unrelated unique
    # constraint (caught by tests/migrations/test_latest_migration_round_trips.py).
    op.create_index(op.f('ix_worker_billing_job_id'), 'worker_billing', ['job_id'], unique=True)
    op.create_index(op.f('ix_worker_billing_status'), 'worker_billing', ['status'], unique=False)

    # payments.subscription_id was left without a real FK when Issue 1
    # added it, since worker_billing didn't exist yet -- fulfilling that
    # now that it does.
    op.create_foreign_key(
        'payments_subscription_id_fkey', 'payments', 'worker_billing',
        ['subscription_id'], ['id'], ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('payments_subscription_id_fkey', 'payments', type_='foreignkey')

    op.drop_index(op.f('ix_worker_billing_status'), table_name='worker_billing')
    op.drop_index(op.f('ix_worker_billing_job_id'), table_name='worker_billing')
    op.drop_index(op.f('ix_worker_billing_worker_profile_id'), table_name='worker_billing')
    op.drop_table('worker_billing')

    _status_enum.drop(op.get_bind(), checkfirst=True)
