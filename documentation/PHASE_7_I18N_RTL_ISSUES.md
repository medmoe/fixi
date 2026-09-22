# Phase 7 — i18n & RTL: GitHub Issues

Milestone: `Phase 7 — i18n & RTL`
Suggested labels to create first: `phase-7`, `frontend`, `mobile`, `backend`, `architecture`, `content`, `qa`, `algeria-specific`

Each `---` block below is one issue: title, labels, and body. Copy each into
"New Issue", or use `gh issue create` (see `create_phase7_issues.sh` in this
same folder for a scripted version).

---

## Issue 1: i18n framework setup (web + mobile)

**Labels:** `frontend`, `mobile`, `architecture`, `phase-7`

**Body:**

Everything else in this phase depends on having a translation system in place
— build this first.

### Tasks
- [ ] Choose library: `react-i18next` for web, `i18next` + `expo-localization`
      for React Native (shared translation JSON where possible)
- [ ] Directory structure: `locales/ar/*.json`, `locales/fr/*.json`,
      namespaced by feature (`auth.json`, `jobs.json`, `profile.json`, etc.)
- [ ] Language detection: `preferred_language` from `users` table on login;
      fall back to device/browser locale for logged-out users
- [ ] Language switcher component (web header + mobile settings)
- [ ] Persist language choice: update `users.preferred_language` on change,
      not just local state
- [ ] Fallback behavior: missing key in `ar` falls back to `fr` (or vice
      versa) instead of showing a raw key, and logs a warning in dev

### Acceptance criteria
- Switching language updates the entire app immediately, no reload required
  on web
- Language choice persists across sessions and devices (via `users` table)
- No raw translation keys ever visible to end users, even with missing
  translations

---

## Issue 2: Extract & translate all UI strings (Arabic + French)

**Labels:** `frontend`, `mobile`, `content`, `phase-7`

**Body:**

### Tasks
- [ ] Audit existing components for hardcoded English/placeholder strings
- [ ] Extract into translation keys across web + mobile
- [ ] Arabic translation — MSA (Modern Standard Arabic), Darija-friendly
      wording per launch checklist, not stiff literal MSA-only phrasing
- [ ] French translation
- [ ] Pluralization rules handled per language (Arabic has more plural forms
      than French — verify library config handles this correctly, don't
      assume English-style singular/plural)
- [ ] Native speaker review pass before merge (required review step, not
      just a translator's first draft)

### Acceptance criteria
- Zero hardcoded user-facing strings remain in components (lint rule or
  manual audit sign-off)
- Both AR and FR translations reviewed and approved by a native speaker
- Plural forms render correctly in both languages for counts of 0, 1, 2,
  few/many (Arabic), and other

---

## Issue 3: RTL layout switching for Arabic

**Labels:** `frontend`, `mobile`, `phase-7`, `algeria-specific`

**Body:**

Highest-risk item in this phase — RTL bugs are easy to miss and easy to ship.
Budget the most QA time here.

### Tasks
- [ ] Global `dir="rtl"` / `dir="ltr"` toggle on `<html>` (web) tied to
      active language
- [ ] CSS audit: replace physical properties (`margin-left`,
      `padding-right`, `text-align: left`, `float: left`) with logical
      properties (`margin-inline-start`, `padding-inline-end`, etc.) or a
      CSS-in-JS RTL plugin
- [ ] Component-by-component visual QA in RTL: forms, nav, job cards,
      modals, icons that imply direction (back/forward arrows, chevrons)
- [ ] Mobile: React Native `I18nManager.forceRTL()` handling — this
      typically requires an app reload/restart on RN, plan the UX for that
      (splash screen or forced restart prompt)
- [ ] Mixed-content edge cases: Arabic text containing Latin words/numbers
      (names, phone numbers) renders correctly (bidi handling)
- [ ] Third-party components (date pickers, maps, charts) checked
      individually for RTL support — some libraries don't mirror
      automatically

### Acceptance criteria
- Every screen renders correctly mirrored in RTL, including directional
  icons
- No visual regressions introduced in LTR/French mode
- Mobile RTL switch handled gracefully (no broken intermediate state during
  restart)

---

## Issue 4: Locale-aware number, date, and currency formatting

**Labels:** `backend`, `frontend`, `phase-7`, `algeria-specific`

**Body:**

### Tasks
- [ ] Currency formatting: DZD/DA amounts formatted per locale (symbol
      placement, Arabic-Indic vs Western digits — confirm which the target
      users actually expect, this varies by context in Algeria)
- [ ] Date/time formatting: job posted dates, application timestamps, etc.
      via `Intl.DateTimeFormat` or i18next date plugin, localized per
      `ar`/`fr`
- [ ] Number formatting: ratings, distances (km), review counts
- [ ] Centralize formatting in shared utility functions (`formatCurrency()`,
      `formatDate()`) — not scattered inline `toLocaleString()` calls, so
      behavior stays consistent and testable
- [ ] Unit tests covering both locales for each formatter

### Acceptance criteria
- All currency, date, and number displays go through the shared formatting
  utilities — no inline formatting left in components
- Formatting output confirmed correct for both `ar` and `fr` by a native
  speaker, not just technically "not broken"

---

## Issue 5: Trade category localization

**Labels:** `backend`, `frontend`, `phase-7`

**Body:**

### Tasks
- [ ] Confirm `trade_categories.name_ar` / `name_fr` data is complete and
      reviewed (schema already has both fields — this is a data/QA task,
      not new schema)
- [ ] API returns the correct name field based on request locale, or
      returns both and lets frontend pick (decide one approach and document
      it)
- [ ] Frontend: category dropdowns, filters, job cards, worker profiles all
      pull the localized name — audit for any place still reading
      `name_fr` unconditionally as a leftover from pre-i18n code
- [ ] Search/filter by category works correctly regardless of UI language
      (matching shouldn't break if slug vs. localized name gets confused)

### Acceptance criteria
- Every trade category displays in the active UI language everywhere it
  appears
- Filtering/searching by category returns identical results regardless of
  active language

---

## Issue 6: Cross-locale QA pass

**Labels:** `frontend`, `mobile`, `qa`, `phase-7`

**Body:**

### Tasks
- [ ] Full manual walkthrough of core flows (register → post job → apply →
      accept → review) in Arabic/RTL and in French/LTR
- [ ] Mobile walkthrough of the same flows on iOS + Android
- [ ] Screenshot regression check for key screens in both languages (a
      lightweight manual checklist is fine if no visual-diff tooling exists
      yet)
- [ ] Verify Cypress E2E suite (from Phase 4) still passes with a
      non-default language selected, or add a language-parameterized run
- [ ] Sign-off against the roadmap's Algeria Launch Checklist items: "All
      UI text available in Arabic and French" + "RTL layout fully tested on
      Arabic"

### Acceptance criteria
- Core flows complete end-to-end without visual or functional breakage in
  both languages, on web and mobile
- Two relevant Algeria Launch Checklist items can be checked off with
  evidence (screenshots/test run links), not just marked done

---

## Suggested order

`1 → 2 → 3 → (4 and 5 in parallel) → 6`

Issue 3 (RTL) is the one to budget the most time for — it tends to surface
layout bugs across nearly every screen, not just new ones. Consider starting
it in parallel with the tail end of Issue 2 once enough strings are extracted
to test against.
