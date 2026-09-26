# Fixi

Job-marketplace platform for Algeria (AR/FR-first, EN added later) — FastAPI + SQLAlchemy 2.0 backend (`src/app/`), React/Vite frontend (`frontend/`, see `frontend/CLAUDE.md` for frontend-specific conventions). See `README.md` for the product pitch and tech-stack table — this file is conventions and gotchas, not an intro.

Development happens in phases tracked as GitHub milestones. Phase 8 (payments, cash-only, admin/verification) is in progress as of this writing.

## Documentation map — check here before grepping the repo

- `documentation/ROADMAP.md` — phases, target market, DB schema overview
- `documentation/PHASE_{7,8}_*.md` — per-phase issue specs (i18n/RTL, payments/admin). Phase 6 (notifications) exists at `documentation/PHASE_6_NOTIFICATIONS_ISSUES.md` but is gitignored — it's still on disk locally, just not tracked; leave that as-is unless the user says otherwise.
- `documentation/FRONTEND_README.md` — API integration guide (endpoints, auth model) written for frontend work
- `documentation/TESTING_SKILL.md` — dense DO/DON'T list for backend + frontend test-writing gotchas; read before writing tests
- `documentation/HTTP_CLIENT.md`, `SET_UP_DEBBUGER.md` — IDE tooling setup (PyCharm HTTP client, remote debugger)
- `documentation/SMS_GATEWAY_RUNBOOK.md` — SMS OTP hardware setup (not provisioned yet)
- `documentation/DEVELOPMENT_WORKFLOW.md`, `CRUD_TEST_WORKFLOW.md`, `SCHEMA_TESTS_WORKFLOW.md` — generic layered-architecture workflow guides, mostly upstream-boilerplate-derived but still broadly applicable
- `documentation/scripts/SEEDING_DEVELOPMENT_DATA.md` — dev data seeding scripts
- `documentation/archive/` — superseded or generic docs kept for reference only (upstream `fastapi-boilerplate` README, a stale AI-assistant system-prompt draft, an unfilled Docker notes template). Don't treat anything in here as current guidance.
- `documentation/decisions/` — short ADRs for consequential, hard-to-reverse, or explicitly-asked-the-user decisions (see "Recording decisions" below). Check here before re-litigating something that looks like it was already decided on purpose.

**`docs/` (repo root) is *not* Fixi documentation** — it's the upstream `fastapi-boilerplate`'s own public mkdocs site (`site_name: FastAPI Boilerplate`, `site_author: Benav Labs` in `mkdocs.yml`), never adapted for this project. Don't read it for Fixi context and don't put new notes there — everything project-specific goes in `documentation/`.

## Backend architecture at a glance

FastAPI + SQLAlchemy 2.0 (`MappedAsDataclass` models) + FastCRUD + Pydantic v2 schemas + Alembic + PostgreSQL/PostGIS + MinIO (S3-compatible) + Redis + an `arq` background worker. Layering: `models/` → `schemas/` → `crud/` → `services/` → `api/v1/`. Adding a feature typically means: model + schema (Base/Create/Update/UpdateInternal/Read) + CRUD wrapper + hand-written migration + a service function for any real business logic + tests under `tests/<feature>/{unit_tests/{model,schema}_tests,integration_tests}`.

## Load-bearing gotchas

Each of these cost real debugging time to discover once — don't rediscover them.

1. **FastCRUD's `update(..., return_as_model=True)` RETURNINGs every model column, ignoring `schema_to_select`.** Any Read schema with `extra="forbid"` that doesn't declare a column that exists on the model will raise `extra_forbidden` the moment that column is added — and this breaks *every* endpoint that updates that model, not just the one you're adding a field for. When adding a column: add it to every Read schema built on that model. If it must never be serialized, use `Field(default=..., exclude=True)` rather than omitting it (see `WorkerProfileRead.cni_document_key` / the `has_cni_document` computed field for the pattern). The matching trap: manually rebuilding a schema via `other_model.model_dump()` — computed fields appear in the dump but aren't accepted as constructor kwargs (exclude them from the dump), and `exclude=True` fields vanish from the dump and must be re-added explicitly from the live attribute (see `get_worker_profile` in `api/v1/worker_profile.py`).
2. **Never run `alembic revision --autogenerate`.** The dev DB has PostGIS's TIGER geocoder tables (`addrfeat`, `county`, `tract`, ...) that aren't in `Base.metadata` — autogenerate produces a migration that tries to drop them. Always hand-write migrations following the existing `op.create_table`/`op.create_index` style already in `src/migrations/versions/`.
3. **`create_tables_on_start=True` (`core/setup.py`) runs `Base.metadata.create_all()` on every app startup.** Since `web`'s container bind-mounts source live with `--reload`, adding a brand-new model gets it auto-created *before* its own Alembic migration ever runs. After adding a model: drop the auto-created table, then run `alembic upgrade head` for real so the migration is actually validated. This only affects whole new tables — a new *column* on an existing table isn't touched by `create_all`, so that specific race doesn't apply there.
4. **`MappedAsDataclass` field ordering**: a required field (no `default=`) must be declared before any field with a `default=`, in source order — `nullable=True` alone does not make a column optional in the generated `__init__`.
5. **`docker compose -f docker-compose.test.yml down` shares the `fixi` project name with the dev stack** — it tears down dev containers too. To clean up test containers without touching dev, `docker stop`/`docker rm` the specific `test-*` containers by name instead. Restore the dev stack after any test run with `docker compose up -d db redis web frontend worker minio minio-setup` (add `--build web worker` if a migration or dependency changed since they were last built).
6. **MinIO: `bucket_uploads` is public-read** (the policy is applied on bucket creation in `MinioClient`). Never store anything sensitive there. For private content, use `MinioClient.ensure_private_bucket_exists()` + `generate_presigned_get_url()` instead — see `worker_verification_service.py` for the pattern (CNI verification documents).
7. **Running the backend test suite**: `docker compose stop redis` first (frees port 6379 for `test-redis`, since both stacks share it), then `docker compose -f docker-compose.test.yml run --rm tests pytest tests -q --no-cov`. Full suite takes ~10-15 minutes. After any migration change, also run `tests/migrations/test_latest_migration_round_trips.py` — it catches drift between hand-written DDL and model metadata that nothing else will.
8. **`ruff` has `fix = true` set in `pyproject.toml`** — `ruff check` always auto-fixes, it's not a dry-run linter here. Scope every `ruff check` call to the exact file(s) you actually touched (`uv run ruff check src/app/foo.py tests/foo/test_bar.py`), never `uv run ruff check src tests` — running it against the whole tree will silently reformat decades of unrelated pre-existing lint debt across the repo and turn a small diff into a 40-file one.

## Context discovery — don't scan more than the task needs

This repo will keep growing; treat repository-wide exploration as a last resort, not a default.

1. Start from the files the task actually names, plus their direct imports/dependencies (the model/schema/crud/service/api chain for a backend feature; the component/hook/type/api chain for a frontend one).
2. Only widen to shared infrastructure (e.g. `core/`, `services/notifications/`, shared UI components) when the narrow context is genuinely insufficient — not as a precaution.
3. Broad, repo-wide investigation (grepping the whole tree, reading unrelated feature directories) is a last resort, not a starting point — if you reach for it, you should be able to say why the narrower levels didn't answer the question.
4. During iteration, run the smallest relevant test (a single file or feature directory), not the full suite — reserve the full backend/frontend suite for right before reporting a task done, matching the workflow already used throughout this project's history.
5. When a command's output would be large, filter it (`| tail -N`, `-q --no-cov`, targeted `grep`) rather than dumping everything back into context — but never trim away the actual error/traceback you need to debug.

## Recording decisions

When a decision is consequential, hard to reverse cheaply, or was resolved by explicitly asking the user (not just an obvious implementation detail), write a short ADR in `documentation/decisions/NNN-short-title.md`:

```
## Decision
## Why
## Alternatives considered
## Consequences
```

This is for things a future session would otherwise have to re-derive or accidentally re-litigate — not for routine implementation choices. See `documentation/decisions/` for examples already on file.

## Notification pattern (Phase 6)

Every user-facing event goes through `notify_user()` (`services/notifications/`), never an ad-hoc send. A new event type needs `notify_user(event_type=..., title_{ar,fr,en}=..., body_{ar,fr,en}=..., email_payload=...)` at the call site, plus — if it should email — an HTML template per language in `services/notifications/email_templates/` and a subject entry in that module's `_SUBJECTS` dict. `MailjetEmailProvider` fails the whole email send if the template file is missing; it does not fall back to plain text.

## Admin action audit log (Phase 8)

`AdminActionLog` (`models/admin_action_log.py`) is a generic, reusable audit trail — a `target_type`/`target_id` string+int pair, not a dedicated FK per resource type. Any new admin action (suspend, approve, reject, ...) should log through `crud_admin_action_log`, not a new one-off logging mechanism.

## i18n, backend side (Phase 7)

Email/SMS copy uses plain `string.Template` `$var` substitution (`Template(...).safe_substitute(...)`), not Jinja — deliberately dependency-free. Arabic templates need `dir="rtl"` and `text-align:right`/`border-right` — mirror an existing AR template rather than writing RTL layout from scratch.

## Commit policy

Default workflow for finished work (issues, fixes, requested changes) — no need to ask each time:

1. Branch from an up-to-date `main`, named `<issue-number>-short-slug` (or just `short-slug` with no issue).
2. Once verified (relevant tests green, `npm run build` for frontend changes, `ruff` on touched files), commit with a clear message, push, and open a PR against `main` (reference the issue with `Closes #N`).
3. Watch CI; once **every** check is green, merge with a merge commit (`gh pr merge --merge --delete-branch`), then delete the local branch and pull `main`.
4. If CI fails, fix it on the branch and repeat — never merge red, never force-push `main`.

Exceptions: if the user says "don't commit yet" (or similar), that stays in force until they lift it, even across otherwise-unrelated requests in the same session. The user may commit/push/merge independently in parallel; if repo state looks unexpectedly different from what you left it, check `git log`/`git status` broadly before assuming work was lost.
