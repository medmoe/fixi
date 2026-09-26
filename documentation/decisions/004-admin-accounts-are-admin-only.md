# 004 — Admin accounts are admin-only, with their own layout

## Decision

A superuser (`is_superuser=True`) is an admin-only account. The frontend never shows it the customer or worker dashboard: `RoleBasedDashboard` sends any `/dashboard/*` URL to `/admin/users`. Every `/admin/*` page renders inside `AdminLayout`, which has a permanent sidebar (Users, Verification queue, Commission dashboard, Platform analytics, Account). Admins are created with `src/scripts/create_first_superuser.py`. It only creates fresh accounts and refuses to promote an existing customer or worker.

## Why

The previous design (`is_superuser` on top of an ordinary customer/worker account, with admin links added to the bottom of that dashboard's sidebar) caused two problems:

- Admins saw customer UI they have no use for ("Customer" role label, Post New Job, the customer tabs).
- Each admin page was a standalone route with no shell, so clicking an admin link dropped the sidebar and left no way to get back.

The user confirmed that admin accounts are admin-only. They still need an Account page to edit their own details, so `AdminLayout` includes one (it reuses `AccountTab`).

## Alternatives considered

- **Add an `admin` value to `UserRole`.** This would be cleaner in the data model, but it needs an enum migration and every backend/frontend branch on `role_type` would have to handle a third value. `is_superuser` already gates every admin endpoint (`get_current_superuser`), so it is enough. `role_type` is still required by the schema; for admins it is set to `customer` and ignored.
- **Keep admins as dual-purpose accounts, with a "switch to my dashboard" link.** The user rejected this because admins don't use customer features.
- **Promote existing accounts in the creation script.** Rejected: under this decision, promoting someone silently cuts them off from their own jobs and profile in the UI.

## Consequences

- Hiding the customer/worker UI is frontend-only. The backend doesn't stop a superuser token from calling customer endpoints (e.g. creating a job). Add a server-side guard if that ever matters.
- An existing person who also needs admin access must get a second, admin-only account with a different email address.
- New admin pages must be added as children of the `/admin` route in `router.tsx` and given an entry in `AdminLayout`'s `navItems`.
