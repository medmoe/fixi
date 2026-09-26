# Fixi frontend

React 18 + Vite + TypeScript. Server state: TanStack Query. Client state: Redux Toolkit (mostly just the auth token/session). Forms: react-hook-form + zod. UI: shadcn/ui + Radix + Tailwind v4. i18n: react-i18next. See the root `CLAUDE.md` for backend conventions and project-wide gotchas, and `documentation/FRONTEND_README.md` for the API surface this frontend talks to.

## Feature module structure

Each `src/features/<name>/` has `components/`, `hooks/`, `pages/`, `types/`, each with its own `index.ts` barrel, re-exported again from the feature's top-level `src/features/<name>/index.ts`. Cross-feature imports go through that top-level barrel (`@/features/worker`), not deep paths. Components import their *own* feature's hooks the same way (a self-referential barrel import) — matching the existing pattern (`AvatarUploadField`, `CniVerificationField`).

## i18n

One JSON file per locale per feature namespace: `src/locales/{ar,fr,en}/<feature>.json`, wired into both the `NAMESPACES` array and the `resources` map in `src/lib/i18n.ts`. Pluralization uses i18next's `_one`/`_other` suffixes (plus `_zero`/`_two`/`_few`/`_many` for Arabic) — copy an existing key's full set of plural forms exactly rather than only adding `_other`.

**A missing key shows the raw key string in dev and an empty string in prod — `defaultValue` passed to `t()` is silently ignored** (`parseMissingKeyHandler` in `src/lib/i18n.ts` overrides it unconditionally). Don't rely on `defaultValue` as a fallback for a dynamic/unbounded value (e.g. a backend-generated string used as a translation key) — every value looked up by key needs a real translation, or design around not needing one.

## Auth model

`is_superuser` is a boolean flag on any customer/worker account, not a separate `role_type` (which is only ever `'customer' | 'worker'`). Gate admin-only routes with `<ProtectedRoute requireSuperuser>`, not `allowedRoles`. Superuser accounts are admin-only (`documentation/decisions/004-admin-accounts-are-admin-only.md`): `RoleBasedDashboard` sends them from any `/dashboard/*` URL to `/admin/users`, and every admin page is a child route of `/admin`, rendered inside `AdminLayout` (`features/admin/components/`). A new admin page needs both a child route in `router.tsx` and an entry in `AdminLayout`'s `navItems`. Admins are created with `src/scripts/create_first_superuser.py`, never by promoting a customer/worker.

## Testing conventions

- Run via `npm run vitest` (dockerized), not `npx vitest` directly.
- Page tests: mock the page's own hooks and child components, not the DOM/library internals underneath them (see `AdminUsersPage.test.tsx`).
- Mock `@/components/ui/select` as a native `<select>` for any test that needs to interact with a Radix `Select` (see `AdminUserFilterBar.test.tsx`) — the real thing renders its options in a portal, invisible to `screen` queries.
- Radix `AlertDialog` content is not in the DOM until the trigger is actually clicked — click the trigger first in tests even just to check title/description text.
- A button's accessible name comes from a static `aria-label` if one is set, even when the visible text differs by state (e.g. "Upload" vs "Re-upload"). Don't put a static `aria-label` on a button whose visible text changes with state — let the text drive the accessible name, or make the label track the same state.
- `tests/mocks.ts` / `tests/helpers.tsx` per feature hold shared fixtures (e.g. `mockWorker`, `mockProfile`) — extend these when a model type gains a field, rather than building one-off literals per test file.
- `documentation/TESTING_SKILL.md` has a much longer DO/DON'T list (Radix mocking specifics, react-hook-form + act() timing, etc.) — check it before fighting a weird jsdom/Radix test failure.

## Build

`npm run build` runs `tsc -b && vite build` inside Docker. Always run it after a type change — the project's strict/`noUnusedLocals` settings catch things a `vitest`-only pass won't (e.g. an unused import in a new test file).
