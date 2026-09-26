# 001 — Worker commission billing model: flat per-job, not subscription

## Decision

Phase 8 Issue 2 (worker commission/subscription tracking) uses a **flat commission charged once per completed job**, not a recurring subscription. One `worker_billing` row is created automatically per completed job, hooked into `job_lifecycle_service.mark_job_complete()` at the exact point a job's status flips to `COMPLETED`.

## Why

The roadmap and issue text explicitly posed this as an open "OR" — flat commission per job vs. recurring subscription — with no prior decision on record. Asked the user directly (`AskUserQuestion`) rather than guessing; they picked flat commission per job.

## Alternatives considered

- **Recurring subscription** (e.g. monthly flat fee regardless of job volume): rejected — simpler to bill but decouples platform revenue from actual worker activity, and the roadmap didn't lean either way.

## Consequences

- `WorkerBilling.job_id` is unique (one row per job, not per billing period) — there's no concept of a billing cycle or subscription status.
- `WORKER_COMMISSION_AMOUNT` / `WORKER_COMMISSION_DUE_DAYS` (`core/config.py`) are flat per-job constants, explicitly documented as starting guesses, not negotiated business numbers.
- `WorkerBillingStatus.OVERDUE` exists as an enum value but nothing writes it automatically yet (no scheduled job) — `WorkerBillingRead.is_overdue` is derived at read time (`status == PENDING and due_date < now()`) instead.
- If the business later wants a subscription model, this would need a genuinely new table/flow (billing periods, proration), not a small extension of `worker_billing`.
