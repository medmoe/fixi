"""add english to preferredlanguage enum

Revision ID: d2b5f0a38c4e
Revises: c1a4e9f27b3d
Create Date: 2026-09-23 10:00:00+00:00

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd2b5f0a38c4e'
down_revision: Union[str, None] = 'c1a4e9f27b3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE preferredlanguage ADD VALUE IF NOT EXISTS 'en'")


def downgrade() -> None:
    # Postgres has no ALTER TYPE ... DROP VALUE -- rebuild the enum type
    # without 'en' instead. Only safe if no user row actually has
    # preferred_language='en'; that's a real precondition of downgrading
    # past this point, not something this migration can enforce for you.
    op.execute("ALTER TYPE preferredlanguage RENAME TO preferredlanguage_old")
    op.execute("CREATE TYPE preferredlanguage AS ENUM ('ar', 'fr')")
    op.execute(
        "ALTER TABLE users "
        "ALTER COLUMN preferred_language TYPE preferredlanguage "
        "USING preferred_language::text::preferredlanguage"
    )
    op.execute("DROP TYPE preferredlanguage_old")
