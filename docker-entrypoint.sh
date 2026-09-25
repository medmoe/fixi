#!/bin/sh
set -e

# Applies any pending Alembic migrations before the app starts. This used to
# be a manual step (`docker compose exec web alembic upgrade head`) that was
# easy to forget after pulling in a new migration -- the failure mode wasn't
# a clear startup error, it was a live endpoint 500ing with something like
# `column trade_categories.display_name_ar does not exist` the first time a
# request touched the new column.
alembic upgrade head

exec "$@"
