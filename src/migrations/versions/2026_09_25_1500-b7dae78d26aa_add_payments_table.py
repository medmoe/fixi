"""add payments table

Revision ID: b7dae78d26aa
Revises: 82415d322630
Create Date: 2026-09-25 15:00:41.360706+00:00

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b7dae78d26aa'
down_revision: Union[str, None] = '82415d322630'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_method_enum = postgresql.ENUM(
    'cash', 'chargily',
    name='paymentmethod',
)
_status_enum = postgresql.ENUM(
    'pending', 'completed', 'failed', 'refunded',
    name='paymentstatus',
)


def upgrade() -> None:
    _method_enum.create(op.get_bind(), checkfirst=True)
    _status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('payer_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('method', postgresql.ENUM(name='paymentmethod', create_type=False), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=True),
        sa.Column('subscription_id', sa.Integer(), nullable=True),
        sa.Column('payee_id', sa.Integer(), nullable=True),
        sa.Column('recorded_by', sa.Integer(), nullable=True),
        sa.Column('status', postgresql.ENUM(name='paymentstatus', create_type=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['payee_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_payments_payer_id'), 'payments', ['payer_id'], unique=False)
    op.create_index(op.f('ix_payments_method'), 'payments', ['method'], unique=False)
    op.create_index(op.f('ix_payments_job_id'), 'payments', ['job_id'], unique=False)
    op.create_index(op.f('ix_payments_subscription_id'), 'payments', ['subscription_id'], unique=False)
    op.create_index(op.f('ix_payments_payee_id'), 'payments', ['payee_id'], unique=False)
    op.create_index(op.f('ix_payments_recorded_by'), 'payments', ['recorded_by'], unique=False)
    op.create_index(op.f('ix_payments_status'), 'payments', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_payments_status'), table_name='payments')
    op.drop_index(op.f('ix_payments_recorded_by'), table_name='payments')
    op.drop_index(op.f('ix_payments_payee_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_subscription_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_job_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_method'), table_name='payments')
    op.drop_index(op.f('ix_payments_payer_id'), table_name='payments')
    op.drop_table('payments')

    _status_enum.drop(op.get_bind(), checkfirst=True)
    _method_enum.drop(op.get_bind(), checkfirst=True)
