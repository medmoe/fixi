"""
Regression guard for the class of bug that produced a live 500 --
`column trade_categories.display_name_ar does not exist` -- caused by
a correct migration that simply nobody had run yet. Nothing in the
rest of the suite would have caught that: tests/conftest.py builds its
schema directly via Base.metadata.create_all(), never by replaying
migration files, so a migration that's missing, wrong, or was never
generated for a model change is invisible to every other test here.

This can't check the *entire* migration history the way `alembic
check` normally would -- this project's Alembic history starts mid
schema (the earliest migration already assumes `users`, `jobs`, and
`worker_profiles` exist, with no baseline migration that creates
them), so replaying it from scratch fails regardless of anything this
test cares about. Instead: build the current schema via create_all()
(a stand-in for "already fully migrated", same as every real
deployment's dev database actually is), stamp it at head, then undo
and redo *only* the most recent migration -- exactly the piece that's
new, and exactly the piece a "forgot to write/run the migration"
mistake would land in.
"""

import asyncio
import uuid
from pathlib import Path

import pytest
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from src.app.core.config import settings
from src.app.core.db.database import Base

pytestmark = [pytest.mark.integration, pytest.mark.slow]

REPO_SRC = Path(__file__).resolve().parents[2] / "src"
ALEMBIC_INI = REPO_SRC / "alembic.ini"


def _script_directory() -> ScriptDirectory:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("script_location", str(REPO_SRC / "migrations"))
    return ScriptDirectory.from_config(cfg)


def _is_known_autogenerate_noise(diff_entry) -> bool:
    """Two categories `compare_metadata` always flags here, neither of
    which reflects an actual model/migration mismatch:

    - `spatial_ref_sys` is PostGIS's own system table (created by
      `CREATE EXTENSION postgis`), not part of Base.metadata.
    - A redundant `UniqueConstraint` on a lone `id` column is a known
      Alembic autogenerate quirk for Postgres primary keys -- the PK
      already enforces uniqueness, so this "difference" only ever
      round-trips as a no-op instead of pointing at anything to fix.
    """
    op = diff_entry[0]
    if op == "remove_table":
        return diff_entry[1].name == "spatial_ref_sys"
    if op == "add_constraint":
        constraint = diff_entry[1]
        return constraint.__class__.__name__ == "UniqueConstraint" and [c.name for c in constraint.columns] == ["id"]
    return False


async def test_the_latest_migration_downgrades_and_upgrades_cleanly_and_matches_models(monkeypatch):
    script = _script_directory()
    head_revision = script.get_current_head()
    assert head_revision is not None, "no migrations found -- something is misconfigured"

    check_db_name = f"alembic_roundtrip_check_{uuid.uuid4().hex[:8]}"
    admin_url = (
        f"{settings.POSTGRES_ASYNC_PREFIX}{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/postgres"
    )
    admin_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT", poolclass=NullPool)
    async with admin_engine.connect() as conn:
        await conn.execute(text(f'CREATE DATABASE "{check_db_name}"'))
    await admin_engine.dispose()

    # `migrations/env.py` rebuilds its own connection URL from
    # settings.POSTGRES_* every time it runs (ignores anything set on the
    # alembic Config object directly), so this is the only way to point it
    # at the throwaway database instead of the real one.
    monkeypatch.setattr(settings, "POSTGRES_DB", check_db_name)

    check_url = (
        f"{settings.POSTGRES_ASYNC_PREFIX}{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{check_db_name}"
    )
    check_engine = create_async_engine(check_url, poolclass=NullPool)

    try:
        async with check_engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            await conn.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status_type') THEN
                            CREATE TYPE job_status_type AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
                        END IF;
                    END
                    $$;
                    """
                )
            )
            await conn.run_sync(Base.metadata.create_all)

        cfg = Config(str(ALEMBIC_INI))
        cfg.set_main_option("script_location", str(REPO_SRC / "migrations"))

        from alembic import command

        # migrations/env.py calls asyncio.run() internally, which can't be
        # invoked from inside this test's already-running event loop --
        # each command needs its own thread (and thus its own fresh loop).
        await asyncio.to_thread(command.stamp, cfg, "head")
        await asyncio.to_thread(command.downgrade, cfg, "-1")
        await asyncio.to_thread(command.upgrade, cfg, "head")

        async with check_engine.connect() as conn:
            raw_diff = await conn.run_sync(lambda sync_conn: compare_metadata(MigrationContext.configure(sync_conn), Base.metadata))

        diff = [entry for entry in raw_diff if not _is_known_autogenerate_noise(entry)]

        assert diff == [], (
            f"The latest migration ({head_revision}) doesn't produce a schema matching "
            f"the current models. Differences: {diff}"
        )
    finally:
        await check_engine.dispose()
        cleanup_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT", poolclass=NullPool)
        async with cleanup_engine.connect() as conn:
            await conn.execute(text(f'DROP DATABASE IF EXISTS "{check_db_name}" WITH (FORCE)'))
        await cleanup_engine.dispose()
