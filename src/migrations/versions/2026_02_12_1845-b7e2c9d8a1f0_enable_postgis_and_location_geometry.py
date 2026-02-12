"""enable postgis and convert user.location to geometry

Revision ID: b7e2c9d8a1f0
Revises: a3c9d1e2f4b7
Create Date: 2026-02-12 18:45:00.000000+00:00

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7e2c9d8a1f0"
down_revision: Union[str, None] = "a3c9d1e2f4b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "user" not in table_names:
        return

    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    user_columns = {col["name"] for col in inspector.get_columns("user")}
    if "location" in user_columns:
        op.execute(
            """
            ALTER TABLE "user"
            ALTER COLUMN location TYPE geometry(POINT,4326)
            USING CASE
                WHEN location IS NULL OR btrim(location) = '' THEN NULL
                WHEN location ~* '^SRID=[0-9]+;POINT\\s*\\(' THEN ST_Transform(ST_GeomFromEWKT(location), 4326)
                WHEN location ~* '^POINT\\s*\\(' THEN ST_SetSRID(ST_GeomFromText(location), 4326)
                ELSE NULL
            END
            """
        )

    index_names = {idx["name"] for idx in inspector.get_indexes("user")}
    if "ix_user_location_gist" not in index_names and "location" in user_columns:
        op.execute('CREATE INDEX ix_user_location_gist ON "user" USING GIST (location)')


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    if "user" not in table_names:
        return

    index_names = {idx["name"] for idx in inspector.get_indexes("user")}
    if "ix_user_location_gist" in index_names:
        op.execute('DROP INDEX IF EXISTS ix_user_location_gist')

    user_columns = {col["name"] for col in inspector.get_columns("user")}
    if "location" in user_columns:
        op.execute(
            """
            ALTER TABLE "user"
            ALTER COLUMN location TYPE VARCHAR(100)
            USING CASE
                WHEN location IS NULL THEN NULL
                ELSE ST_AsText(location)
            END
            """
        )
