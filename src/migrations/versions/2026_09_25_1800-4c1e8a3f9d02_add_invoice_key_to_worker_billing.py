"""add invoice_key to worker_billing

Revision ID: 4c1e8a3f9d02
Revises: 986862588eba
Create Date: 2026-09-25 18:00:00+00:00

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4c1e8a3f9d02'
down_revision: Union[str, None] = '986862588eba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('worker_billing', sa.Column('invoice_key', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('worker_billing', 'invoice_key')
