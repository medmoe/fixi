# 002 — Admin panels: custom REST + React, not the bundled `crudadmin`

## Decision

All Phase 8 admin-panel issues (#157 user management, #158 CNI verification queue, and by extension #159/#160) are built as **custom FastAPI endpoints gated by the existing `get_current_superuser`/`is_superuser` check, plus React pages under `/admin/...`** — not by registering models on the `crudadmin` library that ships with this codebase (mounted at `/admin`, from the original `fastapi-boilerplate` template).

## Why

`crudadmin` was already installed and mounted, but completely unused (`register_admin_views()` was a no-op) when Issue #157 started. It offers real value for free — auto-generated CRUD screens and a built-in audit-log table (`admin_action_logs`/`admin_audit_log`, actor/resource/action/before-after state) — but:

- It authenticates with its own separate admin-user table and credentials (`ADMIN_USERNAME`/`ADMIN_PASSWORD`), completely disconnected from this app's own `User`/`is_superuser` model that every other admin-gated feature already uses.
- It renders server-side Jinja HTML, not part of the React frontend.
- "Suspend/reactivate" and similar domain actions aren't native `crudadmin` operations — they'd need custom wiring regardless of which base was chosen.

Asked the user directly (`AskUserQuestion`) since this decision would set the pattern for every subsequent admin issue, not just #157. They chose custom REST + React specifically to keep one consistent login/session story across the whole app.

## Alternatives considered

- **Wire up `crudadmin`**: rejected — would leave two parallel, disconnected admin surfaces (the app's real login vs. crudadmin's separate one), and still needs custom code for the actual domain actions.

## Consequences

- A hand-rolled `AdminActionLog` model (`models/admin_action_log.py`) was built instead of using `crudadmin`'s built-in audit table — generic `target_type`/`target_id` fields so it's reusable across #157/#158/#159/#160 rather than one log table per feature.
- Every admin route follows the same shape: a router under `/admin/<resource>` with `dependencies=[Depends(get_current_superuser)]`, plus a React page under `/admin/<resource>` gated by `<ProtectedRoute requireSuperuser>`.
- `crudadmin` remains mounted at `/admin` (root-level, outside `/api/v1`) but unused — it hasn't been removed, just never wired up. A future cleanup could remove the dependency entirely if nothing ends up using it.
