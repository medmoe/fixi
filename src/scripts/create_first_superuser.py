"""Create an admin (superuser) account.

Admin accounts are admin-only: the frontend routes a superuser straight to
the admin panel and never shows them the customer/worker dashboard. So this
script only ever *creates* a fresh account -- it refuses to promote an
existing customer/worker, since that would silently cut that person off
from their own jobs/profile. Use a dedicated email for each admin.

Usage (inside the web container, from /app so `src.` resolves to the
bind-mounted source):

    docker compose exec -w /app web python -m src.scripts.create_first_superuser \
        --name "Jane Admin" --username jane_admin --email jane@fixi.dz

Any flag left out falls back to ADMIN_NAME / ADMIN_USERNAME / ADMIN_EMAIL
from src/.env. The password is prompted for when run interactively, and read
from ADMIN_PASSWORD otherwise (e.g. a one-shot compose service). The
built-in default ADMIN_PASSWORD is rejected outside local/test environments.

Idempotent: re-running with the username/email of an existing admin is a
no-op, so it's safe as a bootstrap step.
"""

import argparse
import asyncio
import getpass
import logging
import sys

from pydantic import ValidationError
from sqlalchemy import or_, select

from src.app.core.config import EnvironmentOption, settings
from src.app.core.db.database import local_session
from src.app.core.security import get_password_hash
from src.app.models.user import User, UserRole
from src.app.schemas.user import UserCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_DEFAULT_PASSWORD = "!Ch4ng3Th1sP4ssW0rd!"


def _read_password() -> str:
    if sys.stdin.isatty():
        password = getpass.getpass("Admin password: ")
        if password != getpass.getpass("Confirm password: "):
            raise SystemExit("Passwords do not match.")
        return password

    password = settings.ADMIN_PASSWORD
    if password == _DEFAULT_PASSWORD and settings.ENVIRONMENT not in (EnvironmentOption.LOCAL, EnvironmentOption.TEST):
        raise SystemExit("Refusing to create an admin with the default ADMIN_PASSWORD outside local/test.")
    return password


async def create_admin(name: str, username: str, email: str, password: str) -> None:
    async with local_session() as db:
        existing = await db.scalar(select(User).where(or_(User.username == username, User.email == email)))
        if existing is not None:
            if existing.is_superuser:
                logger.info(f"Admin user {existing.username} already exists.")
                return
            raise SystemExit(
                f"A non-admin account already uses this username or email ({existing.username}). "
                "Admin accounts are admin-only, so promoting it isn't supported -- use a dedicated email/username."
            )

        try:
            # Same field rules (name/username format, email, password
            # strength) as regular registration.
            validated = UserCreate(name=name, username=username, email=email, password=password)
        except ValidationError as e:
            raise SystemExit(f"Invalid admin details:\n{e}") from e

        db.add(
            User(
                name=validated.name,
                username=validated.username,
                email=validated.email,
                hashed_password=get_password_hash(validated.password),
                is_superuser=True,
                # role_type is required by the schema but inert for admins --
                # the frontend dispatches superusers to the admin panel
                # before looking at it.
                role_type=UserRole.CUSTOMER,
            )
        )
        await db.commit()
        logger.info(f"Admin user {validated.username} created successfully.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an admin (superuser) account.")
    parser.add_argument("--name", default=settings.ADMIN_NAME)
    parser.add_argument("--username", default=settings.ADMIN_USERNAME)
    parser.add_argument("--email", default=settings.ADMIN_EMAIL)
    args = parser.parse_args()

    asyncio.run(create_admin(args.name, args.username, args.email, _read_password()))


if __name__ == "__main__":
    main()
