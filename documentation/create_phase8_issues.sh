#!/usr/bin/env bash
# Bulk-create Phase 8 (merged Payments + Admin/Verification) GitHub issues
# via `gh` CLI.
#
# Prerequisites:
#   - GitHub CLI installed and authenticated: `gh auth login`
#   - Run from inside the target repo (or pass --repo owner/name to each call)
#   - Labels below must exist first — create any not already created in
#     earlier phases with:
#       gh label create phase-8 -c "#0E8A16" -f
#       gh label create backend -c "#1D76DB" -f
#       gh label create frontend -c "#5319E7" -f
#       gh label create architecture -c "#D93F0B" -f
#       gh label create algeria-specific -c "#C2E0C6" -f
#   - Milestone must exist first — create it with:
#       gh api repos/:owner/:repo/milestones \
#         -f title="Phase 8 — Payments (Cash-only) & Admin/Verification"
#
# Usage:
#   chmod +x create_phase8_issues.sh
#   ./create_phase8_issues.sh

set -euo pipefail

MILESTONE="Phase 8 — Payments (Cash-only) & Admin/Verification"

gh issue create \
  --title "Payment abstraction layer (provider interface)" \
  --label "backend,architecture,phase-8" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
Same pattern as the Phase 6 notification abstraction — build the seam now so adding Chargily later is a config change, not a rewrite.

### Tasks
- [ ] Define `PaymentProvider` interface: `recordPayment()`, `getStatus()`, `refund()` (refund can be a no-op stub for cash)
- [ ] `CashProvider` implementation: admin/worker manually marks a payment as received, no external call
- [ ] `payments` table: job_id/subscription_id, payer, payee, amount, method (`cash` for now), status, recorded_by, timestamps
- [ ] Config-driven provider selection, mirroring the notification service pattern from Phase 6
- [ ] Leave a documented stub for `ChargilyProvider` (interface conformance only, no implementation) so it's a known future task, not a surprise

### Acceptance criteria
- No calling code assumes cash specifically — everything goes through `PaymentProvider`
- Adding Chargily later requires only a new provider class + config change, no changes to `worker_billing` or invoice logic
EOF
)"

gh issue create \
  --title "Worker commission/subscription tracking (manual, cash-based)" \
  --label "backend,frontend,phase-8" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
No online billing yet — this is bookkeeping, not payment processing.

### Tasks
- [ ] Decide model per roadmap: flat commission per completed job, or recurring subscription — confirm which one launches first
- [ ] `worker_billing` table: worker_id, period or job reference, amount owed, amount paid, due date, status (`pending`/`paid`/`overdue`)
- [ ] Admin action: mark a worker's commission/subscription as paid (cash received) → writes to `payments` via `CashProvider`
- [ ] Worker-facing view: their own billing status (read-only, no payment UI yet since there's nothing to pay online)
- [ ] Overdue detection (simple date comparison, no automated enforcement yet — flag only)

### Acceptance criteria
- Admin can mark any worker's billing record paid and it's reflected immediately in both admin and worker views
- Overdue records are visually distinguishable in both views
EOF
)"

gh issue create \
  --title "Invoice generation (PDF, Arabic + French)" \
  --label "backend,phase-8" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] PDF generation for commission/subscription invoices (reuse whatever PDF lib fits the stack — e.g. WeasyPrint, Puppeteer, or a Python PDF lib)
- [ ] AR + FR invoice templates, driven by `preferred_language`
- [ ] Invoice reflects cash payment (no "paid via card" language — just amount, date, status)
- [ ] Store generated invoice reference (S3 key or similar) linked to `worker_billing` row
- [ ] Downloadable from worker's billing view and admin panel

### Acceptance criteria
- Invoice PDF generates correctly in both languages with accurate amounts and dates
- Invoice is retrievable at any time from both the worker's and admin's view, not just at generation time
EOF
)"

gh issue create \
  --title "Admin panel: user management" \
  --label "backend,frontend,phase-8" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] List/search/filter users (customers + workers), view detail, suspend/reactivate account
- [ ] Role-based access: only `admin` role can access this panel
- [ ] Audit log of admin actions (who suspended whom, when)

### Acceptance criteria
- Non-admin users cannot reach any admin route, enforced server-side (not just hidden in the UI)
- Every suspend/reactivate action is recorded in the audit log with actor, target, and timestamp
EOF
)"

gh issue create \
  --title "Admin panel: worker CNI verification queue" \
  --label "backend,frontend,phase-8,algeria-specific" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] Queue view of pending `worker_profiles.is_verified = false` with uploaded CNI doc (from S3)
- [ ] Approve/reject action, with rejection reason field
- [ ] On approval: set `is_verified = true`, trigger existing "worker verification approved" notification (SMS + email, per Phase 6)
- [ ] Restricted document access — admin panel fetches CNI via signed S3 URL, not public link

### Acceptance criteria
- CNI documents are never accessible via a public/unauthenticated URL
- Approval triggers the correct notification through the existing `NotificationService`, not a separate ad-hoc send
EOF
)"

gh issue create \
  --title "Admin panel: commission/subscription dashboard" \
  --label "backend,frontend,phase-8" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] Overview of all `worker_billing` records: paid, pending, overdue, filterable by worker/date
- [ ] Manual "mark as paid" action (ties into Issue 1/2's `CashProvider`)
- [ ] Export/summary view for reconciling cash collected (even a CSV export is enough for now — no accounting integration)

### Acceptance criteria
- Admin can filter billing records by status and date range
- CSV export matches what's shown on screen (no discrepancy between displayed totals and exported totals)
EOF
)"

gh issue create \
  --title "Flagged review moderation" \
  --label "backend,frontend,phase-8" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] Reporting mechanism on reviews (if not already present) — flag as inappropriate/spam
- [ ] Admin queue of flagged reviews with approve/remove action
- [ ] Removed review excluded from `avg_rating` aggregation on worker profile

### Acceptance criteria
- Removing a flagged review immediately recalculates the affected worker's `avg_rating`
- Users can only flag a given review once (no duplicate-flag spam)
EOF
)"

gh issue create \
  --title "Platform analytics" \
  --label "backend,frontend,phase-8" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] Core metrics: jobs posted, applications submitted, acceptance rate, completion rate, over time
- [ ] Simple admin dashboard (charts, not a full BI tool) — jobs by trade category, jobs by wilaya/location
- [ ] Conversion funnel: posted → applied → accepted → completed
- [ ] Keep queries performant against production data volume (index the date/status columns you'll filter on)

### Acceptance criteria
- Dashboard loads within an acceptable time against realistic data volume (test against seeded/production-scale data, not just a handful of rows)
- Metrics match manual spot-checks against the database
EOF
)"

echo "Done — 8 Phase 8 issues created."
