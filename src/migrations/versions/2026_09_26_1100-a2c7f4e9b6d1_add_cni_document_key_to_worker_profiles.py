"""add cni_document_key to worker_profiles

Revision ID: a2c7f4e9b6d1
Revises: e5f7c1a8b3d4
Create Date: 2026-09-26 11:00:00+00:00

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a2c7f4e9b6d1'
down_revision: Union[str, None] = 'e5f7c1a8b3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('worker_profiles', sa.Column('cni_document_key', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('worker_profiles', 'cni_document_key')
