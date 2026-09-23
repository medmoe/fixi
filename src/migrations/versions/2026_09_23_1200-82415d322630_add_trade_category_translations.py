"""add trade category translations

Revision ID: 82415d322630
Revises: f7a1c9e63b2d
Create Date: 2026-09-23 12:00:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '82415d322630'
down_revision: Union[str, None] = 'f7a1c9e63b2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable on purpose -- existing rows have no translation yet until the
    # seed script's backfill path (see seed_trade_category.py) runs against
    # them. A trade category without a translation still falls back to
    # `display_name` (English) at read time, same fallback policy as every
    # other i18n surface in this app.
    op.add_column('trade_categories', sa.Column('display_name_ar', sa.String(length=255), nullable=True))
    op.add_column('trade_categories', sa.Column('display_name_fr', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('trade_categories', 'display_name_fr')
    op.drop_column('trade_categories', 'display_name_ar')
