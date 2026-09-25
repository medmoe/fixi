# Phase 8 — Payments (Cash-only) & Admin/Verification: GitHub Issues

This milestone merges the original roadmap's Phase 8 (Payments) and Phase 9
(Admin & Verification), given that Chargily integration is deferred and all
payments are cash-only for now. Chargily is left as a documented stub
interface only — see Issue 1.

Milestone: `Phase 8 — Payments (Cash-only) & Admin/Verification`
Suggested labels to create first (if not already created in earlier phases):
`phase-8`, `backend`, `frontend`, `architecture`, `algeria-specific`

Each `---` block below is one issue: title, labels, and body. Copy each into
"New Issue", or use `gh issue create` (see `create_phase8_issues.sh` in this
same folder for a scripted version).

---

## Issue 1: Payment abstraction layer (provider interface)

**Labels:** `backend`, `architecture`, `phase-8`

**Body:**

Same pattern as the Phase 6 notification abstraction — build the seam now so
adding Chargily later is a config change, not a rewrite.

### Tasks
- [ ] Define `PaymentProvider` interface: `recordPayment()`, `getStatus()`,
      `refund()` (refund can be a no-op stub for cash)
- [ ] `CashProvider` implementation: admin/worker manually marks a payment
      as received, no external call
- [ ] `payments` table: job_id/subscription_id, payer, payee, amount,
      method (`cash` for now), status, recorded_by, timestamps
- [ ] Config-driven provider selection, mirroring the notification service
      pattern from Phase 6
- [ ] Leave a documented stub for `ChargilyProvider` (interface conformance
      only, no implementation) so it's a known future task, not a surprise

### Acceptance criteria
- No calling code assumes cash specifically — everything goes through
  `PaymentProvider`
- Adding Chargily later requires only a new provider class + config change,
  no changes to `worker_billing` or invoice logic

---

## Issue 2: Worker commission/subscription tracking (manual, cash-based)

**Labels:** `backend`, `frontend`, `phase-8`

**Body:**

No online billing yet — this is bookkeeping, not payment processing.

### Tasks
- [ ] Decide model per roadmap: flat commission per completed job, or
      recurring subscription — confirm which one launches first
- [ ] `worker_billing` table: worker_id, period or job reference, amount
      owed, amount paid, due date, status (`pending`/`paid`/`overdue`)
- [ ] Admin action: mark a worker's commission/subscription as paid (cash
      received) → writes to `payments` via `CashProvider`
- [ ] Worker-facing view: their own billing status (read-only, no payment
      UI yet since there's nothing to pay online)
- [ ] Overdue detection (simple date comparison, no automated enforcement
      yet — flag only)

### Acceptance criteria
- Admin can mark any worker's billing record paid and it's reflected
  immediately in both admin and worker views
- Overdue records are visually distinguishable in both views

---

## Issue 3: Invoice generation (PDF, Arabic + French)

**Labels:** `backend`, `phase-8`

**Body:**

### Tasks
- [ ] PDF generation for commission/subscription invoices (reuse whatever
      PDF lib fits the stack — e.g. WeasyPrint, Puppeteer, or a Python PDF
      lib)
- [ ] AR + FR invoice templates, driven by `preferred_language`
- [ ] Invoice reflects cash payment (no "paid via card" language — just
      amount, date, status)
- [ ] Store generated invoice reference (S3 key or similar) linked to
      `worker_billing` row
- [ ] Downloadable from worker's billing view and admin panel

### Acceptance criteria
- Invoice PDF generates correctly in both languages with accurate amounts
  and dates
- Invoice is retrievable at any time from both the worker's and admin's
  view, not just at generation time

---

## Issue 4: Admin panel: user management

**Labels:** `backend`, `frontend`, `phase-8`

**Body:**

### Tasks
- [ ] List/search/filter users (customers + workers), view detail,
      suspend/reactivate account
- [ ] Role-based access: only `admin` role can access this panel
- [ ] Audit log of admin actions (who suspended whom, when)

### Acceptance criteria
- Non-admin users cannot reach any admin route, enforced server-side (not
  just hidden in the UI)
- Every suspend/reactivate action is recorded in the audit log with actor,
  target, and timestamp

---

## Issue 5: Admin panel: worker CNI verification queue

**Labels:** `backend`, `frontend`, `phase-8`, `algeria-specific`

**Body:**

### Tasks
- [ ] Queue view of pending `worker_profiles.is_verified = false` with
      uploaded CNI doc (from S3)
- [ ] Approve/reject action, with rejection reason field
- [ ] On approval: set `is_verified = true`, trigger existing "worker
      verification approved" notification (SMS + email, per Phase 6)
- [ ] Restricted document access — admin panel fetches CNI via signed S3
      URL, not public link

### Acceptance criteria
- CNI documents are never accessible via a public/unauthenticated URL
- Approval triggers the correct notification through the existing
  `NotificationService`, not a separate ad-hoc send

---

## Issue 6: Admin panel: commission/subscription dashboard

**Labels:** `backend`, `frontend`, `phase-8`

**Body:**

### Tasks
- [ ] Overview of all `worker_billing` records: paid, pending, overdue,
      filterable by worker/date
- [ ] Manual "mark as paid" action (ties into Issue 1/2's `CashProvider`)
- [ ] Export/summary view for reconciling cash collected (even a CSV
      export is enough for now — no accounting integration)

### Acceptance criteria
- Admin can filter billing records by status and date range
- CSV export matches what's shown on screen (no discrepancy between
  displayed totals and exported totals)

---

## Issue 7: Flagged review moderation

**Labels:** `backend`, `frontend`, `phase-8`

**Body:**

### Tasks
- [ ] Reporting mechanism on reviews (if not already present) — flag as
      inappropriate/spam
- [ ] Admin queue of flagged reviews with approve/remove action
- [ ] Removed review excluded from `avg_rating` aggregation on worker
      profile

### Acceptance criteria
- Removing a flagged review immediately recalculates the affected worker's
  `avg_rating`
- Users can only flag a given review once (no duplicate-flag spam)

---

## Issue 8: Platform analytics

**Labels:** `backend`, `frontend`, `phase-8`

**Body:**

### Tasks
- [ ] Core metrics: jobs posted, applications submitted, acceptance rate,
      completion rate, over time
- [ ] Simple admin dashboard (charts, not a full BI tool) — jobs by trade
      category, jobs by wilaya/location
- [ ] Conversion funnel: posted → applied → accepted → completed
- [ ] Keep queries performant against production data volume (index the
      date/status columns you'll filter on)

### Acceptance criteria
- Dashboard loads within an acceptable time against realistic data volume
  (test against seeded/production-scale data, not just a handful of rows)
- Metrics match manual spot-checks against the database

---

## Suggested order

`1 → 2 → 3 → (4 and 5 in parallel) → 6 → (7 and 8 in parallel)`

Issue 1 unblocks 2, 3, and 6. Issues 4, 5, 7, and 8 are largely independent
of the payment work and of each other, so they can be parallelized across
contributors once the admin panel shell exists.

**Deferred (not in this milestone):** Chargily Pay checkout integration
(CIB + Edahabia), online worker subscription billing, split payments — these
become a future milestone once cash-only launch is validated. The
`PaymentProvider` interface from Issue 1 is what makes that addition low-risk
later.
