# Frontend Integration Guide (Fixi API)

This document explains how a frontend engineer should interact with the Fixi API and which UI features are required. All endpoints below are relative to `/api/v1`.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication model (required)

The API uses:

- Short-lived access tokens (Bearer) for authenticated requests.
- An HTTP-only `refresh_token` cookie for silent session refresh.

### Register (v2)

`POST /auth/register`

Two role types are supported (discriminator: `role`): `customer`, `handyman`.

Example (customer):

```json
{
  "name": "Alex",
  "username": "alex01",
  "email": "alex@example.com",
  "password": "strongpassword",
  "role": "customer",
  "saved_addresses": ["123 Main St"],
  "loyalty_points": 0
}
```

Example (handyman):

```json
{
  "name": "Pat",
  "username": "patfix",
  "email": "pat@example.com",
  "password": "strongpassword",
  "role": "handyman",
  "skill_category": "Plumbing",
  "skills": ["Pipe repair", "Leak detection"],
  "certification_urls": ["https://example.com/cert.pdf"],
  "hourly_rate": 45.0,
  "availability": { "weekday": "9-5" }
}
```

### Login (v2)

`POST /auth/login`

Body:

```json
{
  "username_or_email": "alex01",
  "password": "strongpassword"
}
```

Response includes an access token and sets the `refresh_token` cookie:

```json
{
  "access_token": "<token>",
  "token_type": "bearer"
}
```

### Refresh

`POST /refresh`

Uses the `refresh_token` cookie; returns a new access token:

```json
{
  "access_token": "<token>",
  "token_type": "bearer"
}
```

### Logout

`POST /logout`

Requires `Authorization: Bearer <access_token>` and clears the `refresh_token` cookie.

### Using the access token

Include on any protected endpoint:

```
Authorization: Bearer <access_token>
```

### Suggested frontend token handling

- Store the access token in memory (or secure storage if required).
- Use `refresh_token` cookie for silent refresh (call `POST /refresh` on 401/403 or on app load).
- Always send cookies on API calls (set `credentials: "include"` in `fetch`).

## API docs (OpenAPI)

When not running in production:

- `/docs`
- `/redoc`
- `/openapi.json`

## Core endpoints (used by UI)

### Users

- `GET /user/me/` (current user)
- `GET /user/{username}`
- `PATCH /user/{username}`

### Worker profiles

- `POST /worker` (create worker profile)
- `GET /workers` (paginated list + filters)
- `GET /worker/{worker_id}`
- `GET /worker/user/{user_id}`
- `PUT /worker/profile` (create or update for logged-in handyman)
- `GET /worker/me`
- `GET /categories` (service categories)
- `GET /professions`

Filters for `GET /workers`:

- `page`, `items_per_page`
- `category` (service_category_id)
- `profession`
- `lat`, `long`, `radius_km` (proximity search)
- `verified_only`, `min_rating`

### Marketplace (jobs + reviews)

- `POST /jobs` (customer creates job)
- `GET /jobs/me` (jobs for current user)
- `GET /jobs/{job_id}`
- `PATCH /jobs/{job_id}/assign` (customer assigns a worker)
- `PATCH /jobs/{job_id}/status` (customer/worker updates status)
- `POST /jobs/{job_id}/accept` (handyman accepts)
- `POST /jobs/{job_id}/complete` (handyman completes)
- `POST /jobs/{job_id}/review` (customer leaves review)
- `GET /jobs/{job_id}/review`
- `PATCH /jobs/{job_id}/review`
- `DELETE /jobs/{job_id}/review`
- `GET /workers/{worker_user_id}/reviews`
- `GET /workers/{worker_user_id}/rating`
- `GET /workers/nearby` (geo search)
- `GET /jobs/nearby` (geo search)

### Posts (optional if used in UI)

- `POST /{username}/post`
- `GET /{username}/posts`
- `GET /{username}/post/{id}`
- `PATCH /{username}/post/{id}`
- `DELETE /{username}/post/{id}`

### Files (two-step upload)

1. Create metadata:
   `POST /files`

```json
{
  "original_file_name": "photo.jpg",
  "mime_type": "image/jpeg",
  "file_size": 1234
}
```

Response contains `id` and `file_url`.

2. Upload binary:
   `POST /files/{file_id}` with `multipart/form-data` `upload_file`.

Other endpoints:

- `GET /files` (paginated)
- `PATCH /files/{file_id}` (replace binary)
- `DELETE /files/{file_id}` (soft delete)

## Pagination

List endpoints use `page` and per-page params (`items_per_page`, `files_per_page`) and return:

- `data`: array of records
- pagination metadata fields (page/total/items)

## Error handling

Errors follow FastAPI’s standard JSON shape, typically:

```json
{
  "detail": "Message"
}
```

Common status codes:

- `401` Unauthorized (missing/invalid token)
- `403` Forbidden (role or ownership checks)
- `404` Not Found
- `409` Duplicate/Conflict
- `422` Validation errors
- `429` Rate limit exceeded

## Recommended frontend features (must build)

### Global

- Auth flow with register/login/logout, persistent sessions via refresh cookie.
- Role-aware UI: `customer` vs `handyman` surfaces.
- Central API client with automatic token attach + refresh on 401/403.

### Customer features

- Create job request (title, description, service category, optional worker assignment).
- View “My Jobs” list with job status and details.
- Assign a worker to an open job.
- Update job status (when applicable).
- Leave/edit/delete review on completed jobs.
- Browse workers by category/profession, rating, and location (nearby search).

### Handyman features

- Create or update worker profile (profession, hourly rate, skills, portfolio images, availability status, bio).
- View “My Jobs” list.
- Accept jobs and mark jobs complete.
- View ratings/reviews summary.
- Discover nearby jobs.

### Shared profile features

- View and edit user profile (name, username, email, bio, location if supported in UI).
- File upload workflow for profile/portfolio images (two-step file API).

### Optional features (if scope allows)

- Posts or “updates” for user profiles (uses `/post` endpoints).
- Admin-only panels (tiers/rate limits, service category creation).

## Environment notes

- API docs (`/docs`, `/redoc`, `/openapi.json`) require a superuser token in non-local environments.
- `refresh_token` is HTTP-only; the frontend cannot read it directly.
