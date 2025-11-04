# Fixi Mobile (React Native + Expo)

A React Native boilerplate built with Expo, TypeScript, React Navigation, Zustand, NativeWind/Tailwind, Axios, and Jest. It implements a basic auth flow (username/password/JWT) and is wired to your backend via `API_BASE_URL`.

## Stack
- Expo (managed workflow) + React Native 0.76
- TypeScript
- React Navigation (stack + tabs)
- Zustand for app state (auth)
- Axios for HTTP
- NativeWind/Tailwind for styling
- React Query for server state
- Jest + @testing-library/react-native for tests

## Project layout
```
mobile/
  App.tsx
  app.config.ts
  package.json
  tsconfig.json
  babel.config.js
  tailwind.config.js
  jest.config.js
  jest.setup.ts
  src/
    navigation/AppNavigator.tsx
    screens/
      auth/LoginScreen.tsx
      auth/RegisterScreen.tsx
      app/HomeScreen.tsx
      app/SettingsScreen.tsx
    lib/
      api.ts
      authApi.ts
    store/
      auth.ts
```

## Getting started
1. Install dependencies:
   ```bash
   cd mobile
   npm ci
   ```
2. Copy env example and adjust:
   ```bash
   cp .env.example .env
   # Set API_BASE_URL to your backend, e.g. from docker compose:
   # API_BASE_URL=http://localhost:8000
   ```
3. Start the app:
   ```bash
   npm run start
   ```
   - Press `a` for Android emulator, `i` for iOS simulator (macOS), or scan the QR code with Expo Go on device.

## Authentication
- Login screen posts to `/api/v1/auth/login` expecting `{ access_token: string }` or `{ token: string }` in response.
- After login, we fetch `/api/v1/users/me` to populate basic profile.
- Auth token is persisted with Expo SecureStore and attached as `Authorization: Bearer <token>` to subsequent requests.
- Adjust endpoints in `src/lib/authApi.ts` to match your FastAPI routes.

## Styling (NativeWind/Tailwind)
- `className` props are available on RN components.
- Configure styles in `tailwind.config.js`.

## Scripts
- `npm run start` — start Expo dev server
- `npm run android` — build and run Android
- `npm run ios` — build and run iOS (macOS)
- `npm run web` — run on web
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check
- `npm test` — Jest tests

## CI
A dedicated workflow `.github/workflows/mobile.yml` runs lint, typecheck, and tests only when files under `mobile/**` change.

## Notes
- When testing on a physical device, set `API_BASE_URL` in `mobile/.env` to your machine's LAN IP (e.g., `http://192.168.1.10:8000`).
- If your backend requires CORS/auth adjustments for mobile, configure accordingly.
