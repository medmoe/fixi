"""fix user_role_enum_values

Revision ID: 1d0a7c473758
Revises: c84eb11eab31
Create Date: 2026-07-13 16:28:38.535077+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1d0a7c473758'
down_revision: Union[str, None] = 'c84eb11eab31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# alembic migration
def upgrade():
    # rename enum values
    op.execute("ALTER TYPE userrole RENAME VALUE 'WORKER' TO 'worker'")
    op.execute("ALTER TYPE userrole RENAME VALUE 'CUSTOMER' TO 'customer'")

def downgrade():
    op.execute("ALTER TYPE userrole RENAME VALUE 'worker' TO 'WORKER'")
    op.execute("ALTER TYPE userrole RENAME VALUE 'customer' TO 'CUSTOMER'")
