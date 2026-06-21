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
