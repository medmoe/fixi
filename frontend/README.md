## Dockerfile notes

- `npm ci` Clean install dependencies from package-lock.json
- This step might fail because your local machine generates a lock file with platform binaries
- for your OS, but Docker needs Linux Alpine binaries. 0
- By running npm install inside the same node:22-alpine container Docker uses, the lock file is generated with the
  correct platform packa0ges.
- And always regenerate the lock file via Docker when onboarding new devs or changing Node versions: npm run lock:docker

## Recommended workflow:

- start everything: docker compose up --build
- if you changed the Dockerfile: docker compose --build frontend
- To install new packages: npm run add:pkg -- package-name
- In case a there is a dependency conflict and want to start fresh: npm run fresh

## Docker compose frontend service

- why use VITE_API_BASE_URL=http://localhost:8000?
- For browser-based frontend code, API calls are made by the browser, not by the frontend container.
- So if your React app calls the backend, it usually needs http://localhost:8000

## The General Pattern for Any Component

```
1. Go to ui.shadcn.com/docs/components
   → Find the component you need
   → Read the props/variants table
   → Copy the example closest to what you want

2. Go to lucide.dev
   → Search for the icon concept (not exact name)
   → Find the icon, note its exact component name (e.g. LogOut)

3. Add the shadcn component if not already added
   → npx shadcn@latest add button

4. Import both and compose them
   → import { Button } from "@/components/ui/button"
   → import { LogOut } from "lucide-react"
```

---

## Quick Reference — Common Icons for UI Actions

| Action        | Lucide Icon            |
|---------------|------------------------|
| Logout        | `LogOut`               |
| Login         | `LogIn`                |
| Settings      | `Settings`             |
| User profile  | `User` or `CircleUser` |
| Delete        | `Trash2`               |
| Edit          | `Pencil`               |
| Close/X       | `X`                    |
| Menu          | `Menu`                 |
| Search        | `Search`               |
| Notifications | `Bell`                 |



## Adding new feature workflow
New feature = repeat these same steps:

1. authApi.ts      → add the API call function
2. authSlice.ts    → add state + reducers if global state needed
3. hooks/          → wrap API call in useMutation or useQuery
4. components/     → build the UI, consume the hook
5. routes/         → add route if it's a new page
6. tests/          → unit test the component + hook



---

Yes. A well-organized frontend test suite uses **different kinds of tests for different layers**, rather than trying to test everything through the UI.

A good rule is:

> **Test behavior at the highest layer that gives you confidence without making tests slow or brittle.**

For a typical frontend (React, Next.js, Vue, etc.), the layers look like this:

```
UI Components
      │
API Hooks / Data Hooks
      │
API Client
      │
Schemas / Utilities
```

## What should be tested?

### 1. Unit tests

These test small, isolated pieces of logic.

Examples:

* Utility functions
* Formatters
* Validation functions
* Schema transformations
* Custom hooks with mocked dependencies

Example:

```ts
formatPrice(1000)
→ "$1,000.00"
```

These tests should be:

* fast
* deterministic
* numerous

---

### 2. Schema tests

Yes.

If you're using libraries like Zod or Valibot, schemas are part of your business logic.

Test things like:

* valid payloads
* invalid payloads
* defaults
* transformations

Example:

```ts
expect(UserSchema.parse(validUser)).toEqual(...)
expect(() => UserSchema.parse(invalidUser)).toThrow()
```

Schemas are easy to break during refactoring, so they're worth testing.

---

### 3. API client tests

If you have functions like:

```ts
getUser()
createWorker()
updateProfile()
```

test that they:

* call the correct endpoint
* send the expected payload
* handle errors appropriately

Typically, you mock `fetch` or your HTTP client.

---

### 4. Hook tests

If you use hooks like:

```ts
useWorkers()
useCreateWorker()
useLogin()
```

test:

* loading state
* success state
* error state
* cache updates (if using libraries like TanStack Query)

You generally mock the API layer rather than making real HTTP requests.

---

### 5. Component tests

These verify what users see and interact with.

Examples:

* button click behavior
* form validation
* loading spinners
* error messages
* conditional rendering

Test from the user's perspective rather than internal implementation details.

---

### 6. Integration tests

These verify that multiple pieces work together.

For example:

```
Login Form
    ↓
Validation
    ↓
API Hook
    ↓
Success Toast
    ↓
Navigation
```

Mock only external services (backend, authentication provider, etc.).

Integration tests provide a lot of confidence because they exercise real interactions between components.

---

### 7. End-to-end (E2E) tests

These run against the deployed application in a browser.

Typical flows:

* Login
* Register
* Create worker
* Edit profile
* Delete worker

Keep the number of E2E tests relatively small because they're slower and more expensive to maintain.

---

# A practical workflow

When implementing a new feature:

### Step 1: Write schemas

```
schemas/
```

Write schema unit tests.

---

### Step 2: Write API functions

```
api/
```

Test request construction and error handling.

---

### Step 3: Write hooks

```
hooks/
```

Test loading, success, and failure states.

---

### Step 4: Build UI

```
components/
```

Test rendering and user interactions.

---

### Step 5: Add integration tests

Verify the complete feature flow.

---

### Step 6: Add or update E2E tests

Only for major user journeys.

---

# Suggested project structure

```
src/
├── api/
│   ├── workers.ts
│   └── __tests__/
├── hooks/
│   ├── useWorkers.ts
│   └── __tests__/
├── schemas/
│   ├── worker.ts
│   └── __tests__/
├── components/
│   ├── WorkerForm.tsx
│   └── __tests__/
├── pages/
└── tests/
    ├── integration/
    └── e2e/
```

Keeping tests close to the code they cover makes them easier to maintain.

# A testing pyramid

A healthy frontend test suite often resembles this:

| Test type   | Approximate share | Purpose                                           |
| ----------- | ----------------: | ------------------------------------------------- |
| Unit        |            60–70% | Verify isolated logic (utilities, schemas, hooks) |
| Component   |            20–30% | Verify rendering and user interactions            |
| Integration |            10–20% | Verify multiple layers work together              |
| E2E         |       A small set | Verify critical user journeys                     |

The exact percentages aren't strict, but the principle is: **many fast tests, fewer slow tests**.

# General guidelines

* Test **behavior**, not implementation details. For example, verify that a success message appears after saving rather than checking that a specific internal state variable changed.
* Mock only the layers outside the scope of the test. A component test should mock the API, while an integration test should let components, hooks, and validation work together.
* Favor a few comprehensive integration tests over many repetitive unit tests that provide little additional confidence.
* Keep E2E tests focused on the application's most important workflows, such as authentication, checkout, or profile management.

Following this workflow gives you a test suite that's fast to run, organized by feature, and resilient to refactoring while still providing strong confidence that the application works as intended.
