## Testing Rules — Fixi Project

### Backend (pytest)

**DO:**
- Use `drop_all` + `create_all` in `async_session` fixture for isolation between tests
- Use `NullPool` on `test_engine` — prevents asyncpg connections crossing event loops
- Use `function` scope for all async fixtures — never `session` or `class` scope with asyncpg
- Flush Redis **before** each test in `async_client_with_redis` — not after
- Override `async_get_db` (not `get_test_db`) in `dependency_overrides`
- Override `rate_limiter_dependency` to `lambda: None` in `async_client` for all non-rate-limit tests
- Use `FakeRateLimiter` for rate limit behavior tests — no real Redis needed
- Use `select().where()` instead of `session.get()` for non-primary-key lookups
- Call `async_session.expire_all()` or use `select()` after cascade deletes to bypass identity map cache
- Use `scalar_one_or_none()` for queries that might return nothing
- Wrap `list()` around `result.scalars().all()` to satisfy `list[T]` type annotations
- Use `cast()` to narrow FastCRUD return types — never `# type: ignore` unless overload system genuinely can't be satisfied
- Use `model_dump(mode="json")` before passing Pydantic objects to SQLAlchemy — converts `AnyHttpUrl`, `Decimal`, `UUID` to plain Python types
- Add `mode="all"` to `useForm` in test wrappers when you need validation on change

**DON'T:**
- Don't mock the DB layer — use real `AsyncSession`
- Don't use `session.get()` with non-primary-key columns — use `select().where()`
- Don't trust `result.current.data` from mutations — check `queryClient.getQueryData()` instead
- Don't let `async_session` fixture drop/create schema while `class_async_session` is active — event loop conflict
- Don't use `commit()` inside fixtures that use `async with db.begin()` — it auto-commits on exit
- Don't use `scope="session"` or `scope="class"` for async fixtures with asyncpg connections
- Don't put `test` config in both `vite.config.ts` and `vitest.config.ts` — vitest only
- Don't import `defineConfig` from `vitest/config` in `vite.config.ts` — use `vite`
- Don't forget `await` on `crud_users.get()` and similar async calls — returns coroutine not result
- Don't use `db.get(Model, keyword=value)` — only positional primary key: `db.get(Model, pk_value)`
- Don't manually delete cascade targets — let `ondelete="CASCADE"` handle it
- Don't use `FakeRateLimiter` with hardcoded `ip="testclient"` — ASGITransport uses `"127.0.0.1"`
- Don't use `user_id=0` for authenticated rate limit tests — use the actual `user.id`

---

### Frontend (vitest + React Testing Library)

**DO:**
- Add `ResizeObserver`, `IntersectionObserver`, `matchMedia`, `URL.createObjectURL` polyfills to `setup.ts` — Radix UI needs them
- Mock shadcn/Radix components that use portals (`Select`, `Dialog`, `Popover`, `Slider`) — portals don't work in jsdom
- Mock `Avatar`/`AvatarImage` — shadcn only renders `<img>` after image load event which jsdom never fires
- Use `fireEvent.change` for `type="number"` inputs when testing invalid values — `userEvent.type` is blocked by `min` attribute in jsdom
- Use `fireEvent.change` for Radix `Slider` — keyboard events don't reach the thumb element in mocked components
- Wrap form interactions + submit in `await act(async () => { ... })` before asserting validation errors
- Use `waitFor` after `act` for async validation assertions
- Use `mutateAsync` instead of `mutate` when you need to await mutation completion in tests
- Check `queryClient.getQueryData(['key', id])` to verify optimistic updates — not `result.current.data`
- Mock `queryClient.invalidateQueries` in `beforeEach` to prevent background refetches breaking `isSuccess`
- Use `screen.debug()` and `console.log(element.value)` as first debug step when assertion fails
- Add `value={field.value ?? ''}` to number inputs in components — prevents uncontrolled→controlled warning
- Use `vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()` in success tests
- Wrap `renderComponent` in `act` when the component uses react-hook-form — async initialization triggers state updates
- Add `SelectContext` with open/close state to Select mocks — enables testing open/close behavior
- Add `document.addEventListener('keydown')` for Escape key in Select mock
- Map raw enum values to display labels in `SelectValue` mock — `{ junior: 'Junior', mid: 'Mid-level', senior: 'Senior' }`

**DON'T:**
- Don't pass regex as string — `getByText('/senior/i')` is wrong, use `getByText(/senior/i)`
- Don't query by `role="slider"` with `name` filter on real Radix Slider — `aria-label` never reaches the thumb element
- Don't query `getByAltText` on shadcn `AvatarImage` — image never loads in jsdom, fallback renders instead
- Don't use `getByRole('option')` on real Radix Select — options render in portal, invisible to `screen`
- Don't rely on Zod's default error messages in tests — they change between versions, always use custom `message:`
- Don't use `result.current.data` to verify mutation side effects — use query cache
- Don't use `mutate` when you need to await — use `mutateAsync`
- Don't assert `isSuccess` after `mutate` without mocking `invalidateQueries` — background refetch resets state
- Don't test Radix internal behavior (portal open/close, keyboard nav) — mock the component and test your logic
- Don't duplicate `test` environment config across `vite.config.ts` and `vitest.config.ts`
- Don't use `vi.unmock` inside a test to partially restore mocks — unpredictable, use separate test files
- Don't spread default values after passed values in `useForm` — passed values must come last to override defaults
- Don't forget `aria-label` on mock components — tests that query by accessible name will fail silently
- Don't use `userEvent.keyboard` for slider interaction on mocked components — use `fireEvent.change`
- Don't test react-hook-form's `form.reset` behavior — it's react-hook-form's responsibility, not your component's
- Don't test shadcn/Radix internals (portal rendering, animation classes, focus management) — those are library tests

---

### General

**DO:**
- Test behavior the user sees — not implementation details
- Mock external I/O (S3, Redis, external APIs) — never mock your own DB layer
- Use `data-testid` only when no accessible role/label exists
- Keep test wrappers (FormProvider, QueryClientProvider) in a shared factory function
- Test schema validation in isolation with `schema.safeParse()` — faster and more reliable than DOM assertions
- Run `screen.debug()` and print element values before debugging DOM queries
- Check what error messages actually exist with `document.querySelectorAll('[data-slot="form-message"]')`

**DON'T:**
- Don't test library behavior — test your component's response to library outputs
- Don't over-mock — mocking your own business logic means you're not testing anything
- Don't hardcode Zod default error messages — they differ between v3 and v4
- Don't mix `async_client` and `async_client_with_redis` in the same test — event loop conflicts
- Don't write tests that only verify a function was called without verifying what it was called with