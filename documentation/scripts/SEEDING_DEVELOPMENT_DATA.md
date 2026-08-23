## Seeding development data

Seed data is split into two scripts, run in order:

1. **`seed_trade_category.py`** — seeds 10 parent trade categories with sub-trades.
2. **`seed_jobs_and_workers.py`** — seeds 20 workers across 3 cities (Algiers,
   Oran, Constantine), 10 customers with open job postings spread across
   trade categories, and 5 pending job applications. Depends on trade
   categories already existing.

### Running the seeds

```bash
python -m src.scripts.seed_trade_category
python -m src.scripts.seed_jobs_and_workers
```

Or via Docker, if your local Postgres runs in a container:

```bash
docker compose exec web python -m src.scripts.seed_trade_category
docker compose exec web python -m src.scripts.seed_jobs_and_workers
```

### Idempotency

Both scripts are safe to run multiple times.

- `seed_trade_category.py` checks if any `TradeCategory` row exists and
  skips entirely if so.
- `seed_jobs_and_workers.py` uses deterministic usernames
  (`seed_worker_01`, `seed_customer_01`, ...) — on re-run, existing users,
  worker profiles, and jobs are detected and skipped rather than duplicated.

### Resetting seed data

To start over, delete rows with a `seed_` prefixed username:

```sql
DELETE FROM users WHERE username LIKE 'seed_%';
```

(Cascading deletes on `worker_profiles`, `worker_trades`, `jobs`, and
`job_applications` clean up related rows automatically.)

To also reset trade categories:

```sql
DELETE FROM trade_categories;
```