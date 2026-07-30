
---

## Systematic debugging checklist for future frontend test failures

```
1. screen.debug()                    → what does the DOM actually look like?
2. console.log(input.value)          → did the value actually get into the field?
3. schema.safeParse(value)           → does the schema reject it in isolation?
4. querySelectorAll('[data-slot]')   → are there error elements with different text?
5. check userEvent vs fireEvent      → does the browser constraint block input?
6. check act() wrapping              → is React done updating before assertion?
7. check mock setup                  → is the right thing mocked?
8. isolate — comment out assertions  → which line actually throws?
```

The most common frontend test failure causes in your project:

| Symptom | Likely cause | Fix |
|---|---|---|
| Element not found | DOM not updated yet | `await waitFor` or `await findBy` |
| Value not in input | Browser constraint blocks it | `fireEvent.change` instead of `userEvent.type` |
| Wrong error message | Zod v4 changed default messages | Custom message in schema |
| `act()` warning | Async state update outside act | Wrap in `await act(async () => {})` |
| `img` not found | shadcn AvatarImage needs load event | Mock shadcn Avatar components |
| `isSuccess` never true | `invalidateQueries` triggers refetch | Mock `invalidateQueries` in beforeEach |
| Event loop error | asyncpg connection reused across loops | NullPool + function scope |

---

## Key lesson

Radix UI components that use **portals** (`Select`, `Dialog`, `Popover`, `Tooltip`, `DropdownMenu`) all have this problem in jsdom. The pattern is always the same:

```
1. Portal renders outside document.body subtree
2. screen.getBy* can't find elements in portals
3. Solution: mock the component to render inline without portal
```

Add this to your debugging checklist for future Radix component tests.