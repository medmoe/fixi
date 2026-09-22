#!/usr/bin/env bash
# Bulk-create Phase 7 GitHub issues via `gh` CLI.
#
# Prerequisites:
#   - GitHub CLI installed and authenticated: `gh auth login`
#   - Run from inside the target repo (or pass --repo owner/name to each call)
#   - Labels and the milestone are created automatically below (idempotent) —
#     no manual setup needed.
#
# Usage:
#   chmod +x create_phase7_issues.sh
#   ./create_phase7_issues.sh

set -euo pipefail

MILESTONE="Phase 7 — i18n & RTL"

# ─── Prerequisites (idempotent) ────────────────────────────────────────────
# Labels: -f overwrites if already present, so safe to re-run. Shared labels
# (backend, frontend, mobile, architecture, algeria-specific) are
# re-declared here too, so this script is self-sufficient even if Phase 6's
# never ran in this repo.
gh label create phase-7 -c "#0E8A16" -f
gh label create frontend -c "#5319E7" -f
gh label create mobile -c "#0052CC" -f
gh label create backend -c "#1D76DB" -f
gh label create architecture -c "#D93F0B" -f
gh label create content -c "#BFDADC" -f
gh label create qa -c "#FEF2C0" -f
gh label create algeria-specific -c "#C2E0C6" -f

# Milestone: the API has no upsert, so only create it if it doesn't exist yet.
if ! gh api repos/:owner/:repo/milestones --paginate --jq '.[].title' \
    | grep -qxF "$MILESTONE"; then
  gh api repos/:owner/:repo/milestones -f title="$MILESTONE"
fi

gh issue create \
  --title "i18n framework setup (web + mobile)" \
  --label "frontend,mobile,architecture,phase-7" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
Everything else in this phase depends on having a translation system in place — build this first.

### Tasks
- [ ] Choose library: `react-i18next` for web, `i18next` + `expo-localization` for React Native (shared translation JSON where possible)
- [ ] Directory structure: `locales/ar/*.json`, `locales/fr/*.json`, namespaced by feature (`auth.json`, `jobs.json`, `profile.json`, etc.)
- [ ] Language detection: `preferred_language` from `users` table on login; fall back to device/browser locale for logged-out users
- [ ] Language switcher component (web header + mobile settings)
- [ ] Persist language choice: update `users.preferred_language` on change, not just local state
- [ ] Fallback behavior: missing key in `ar` falls back to `fr` (or vice versa) instead of showing a raw key, and logs a warning in dev

### Acceptance criteria
- Switching language updates the entire app immediately, no reload required on web
- Language choice persists across sessions and devices (via `users` table)
- No raw translation keys ever visible to end users, even with missing translations
EOF
)"

gh issue create \
  --title "Extract & translate all UI strings (Arabic + French)" \
  --label "frontend,mobile,content,phase-7" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] Audit existing components for hardcoded English/placeholder strings
- [ ] Extract into translation keys across web + mobile
- [ ] Arabic translation — MSA (Modern Standard Arabic), Darija-friendly wording per launch checklist, not stiff literal MSA-only phrasing
- [ ] French translation
- [ ] Pluralization rules handled per language (Arabic has more plural forms than French — verify library config handles this correctly, don't assume English-style singular/plural)
- [ ] Native speaker review pass before merge (required review step, not just a translator's first draft)

### Acceptance criteria
- Zero hardcoded user-facing strings remain in components (lint rule or manual audit sign-off)
- Both AR and FR translations reviewed and approved by a native speaker
- Plural forms render correctly in both languages for counts of 0, 1, 2, few/many (Arabic), and other
EOF
)"

gh issue create \
  --title "RTL layout switching for Arabic" \
  --label "frontend,mobile,phase-7,algeria-specific" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
Highest-risk item in this phase — RTL bugs are easy to miss and easy to ship. Budget the most QA time here.

### Tasks
- [ ] Global `dir="rtl"` / `dir="ltr"` toggle on `<html>` (web) tied to active language
- [ ] CSS audit: replace physical properties (`margin-left`, `padding-right`, `text-align: left`, `float: left`) with logical properties (`margin-inline-start`, `padding-inline-end`, etc.) or a CSS-in-JS RTL plugin
- [ ] Component-by-component visual QA in RTL: forms, nav, job cards, modals, icons that imply direction (back/forward arrows, chevrons)
- [ ] Mobile: React Native `I18nManager.forceRTL()` handling — this typically requires an app reload/restart on RN, plan the UX for that (splash screen or forced restart prompt)
- [ ] Mixed-content edge cases: Arabic text containing Latin words/numbers (names, phone numbers) renders correctly (bidi handling)
- [ ] Third-party components (date pickers, maps, charts) checked individually for RTL support — some libraries don't mirror automatically

### Acceptance criteria
- Every screen renders correctly mirrored in RTL, including directional icons
- No visual regressions introduced in LTR/French mode
- Mobile RTL switch handled gracefully (no broken intermediate state during restart)
EOF
)"

gh issue create \
  --title "Locale-aware number, date, and currency formatting" \
  --label "backend,frontend,phase-7,algeria-specific" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] Currency formatting: DZD/DA amounts formatted per locale (symbol placement, Arabic-Indic vs Western digits — confirm which the target users actually expect, this varies by context in Algeria)
- [ ] Date/time formatting: job posted dates, application timestamps, etc. via `Intl.DateTimeFormat` or i18next date plugin, localized per `ar`/`fr`
- [ ] Number formatting: ratings, distances (km), review counts
- [ ] Centralize formatting in shared utility functions (`formatCurrency()`, `formatDate()`) — not scattered inline `toLocaleString()` calls, so behavior stays consistent and testable
- [ ] Unit tests covering both locales for each formatter

### Acceptance criteria
- All currency, date, and number displays go through the shared formatting utilities — no inline formatting left in components
- Formatting output confirmed correct for both `ar` and `fr` by a native speaker, not just technically "not broken"
EOF
)"

gh issue create \
  --title "Trade category localization" \
  --label "backend,frontend,phase-7" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] Confirm `trade_categories.name_ar` / `name_fr` data is complete and reviewed (schema already has both fields — this is a data/QA task, not new schema)
- [ ] API returns the correct name field based on request locale, or returns both and lets frontend pick (decide one approach and document it)
- [ ] Frontend: category dropdowns, filters, job cards, worker profiles all pull the localized name — audit for any place still reading `name_fr` unconditionally as a leftover from pre-i18n code
- [ ] Search/filter by category works correctly regardless of UI language (matching shouldn't break if slug vs. localized name gets confused)

### Acceptance criteria
- Every trade category displays in the active UI language everywhere it appears
- Filtering/searching by category returns identical results regardless of active language
EOF
)"

gh issue create \
  --title "Cross-locale QA pass" \
  --label "frontend,mobile,qa,phase-7" \
  --milestone "$MILESTONE" \
  --body "$(cat <<'EOF'
### Tasks
- [ ] Full manual walkthrough of core flows (register → post job → apply → accept → review) in Arabic/RTL and in French/LTR
- [ ] Mobile walkthrough of the same flows on iOS + Android
- [ ] Screenshot regression check for key screens in both languages (a lightweight manual checklist is fine if no visual-diff tooling exists yet)
- [ ] Verify Cypress E2E suite (from Phase 4) still passes with a non-default language selected, or add a language-parameterized run
- [ ] Sign-off against the roadmap's Algeria Launch Checklist items: "All UI text available in Arabic and French" + "RTL layout fully tested on Arabic"

### Acceptance criteria
- Core flows complete end-to-end without visual or functional breakage in both languages, on web and mobile
- Two relevant Algeria Launch Checklist items can be checked off with evidence (screenshots/test run links), not just marked done
EOF
)"

echo "Done — 6 Phase 7 issues created."
