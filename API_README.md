# Fixi API

This document explains the Fixi API surface and how to use it. All endpoints are versioned under `/api/v1`.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

The API uses short-lived access tokens (Bearer) plus an HTTP-only refresh cookie.

- **Register (v2)**: `POST /auth/register` (JSON)
- **Login (v2)**: `POST /auth/login` (JSON) -> returns access token and sets `refresh_token` cookie
- **Login (legacy OAuth2)**: `POST /login` (form-urlencoded) -> returns access token and sets cookie
- **Refresh**: `POST /refresh` -> returns a new access token (uses `refresh_token` cookie)
- **Logout**: `POST /logout` -> invalidates tokens and clears the cookie (requires Bearer token)

Use the access token on requests that require authentication:

```
Authorization: Bearer <access_token>
```

### Register payload

`/auth/register` accepts two roles (discriminator: `role`):

- `customer`
- `handyman`

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
  "availability": {"weekday": "9-5"}
}
```

## API Docs (OpenAPI)

When the app is **not** running in production, interactive docs are available at:

- `/docs`
- `/redoc`
- `/openapi.json`

In non-local environments, these routes require a superuser token.

## Endpoint Summary

All paths below are relative to `/api/v1`.

### Auth & Sessions

- `POST /auth/register`
- `POST /auth/login`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `GET /auth/handyman-area` (handyman role only)

### Users

- `POST /user`
- `GET /users` (pagination)
- `GET /user/me/`
- `GET /user/{username}`
- `PATCH /user/{username}`
- `DELETE /user/{username}`
- `DELETE /db_user/{username}` (superuser)
- `GET /user/{username}/rate_limits` (superuser)
- `GET /user/{username}/tier`
- `PATCH /user/{username}/tier` (superuser)

### Posts

- `POST /{username}/post`
- `GET /{username}/posts` (pagination)
- `GET /{username}/post/{id}`
- `PATCH /{username}/post/{id}`
- `DELETE /{username}/post/{id}`
- `DELETE /{username}/db_post/{id}` (superuser)

### Workers

- `POST /worker`
- `GET /workers` (pagination + filters)
- `GET /categories`
- `GET /worker/me`
- `PUT /worker/profile` (handyman role)
- `GET /worker/{worker_id}`
- `GET /worker/user/{user_id}`
- `PATCH /worker/{worker_id}`
- `PATCH /worker/{worker_id}/verify` (superuser)
- `DELETE /worker/{worker_id}`
- `DELETE /db_worker/{worker_id}` (superuser)
- `GET /professions`

### Marketplace

- `POST /service-categories` (superuser)
- `GET /service-categories`
- `POST /jobs` (customer role)
- `GET /jobs/me`
- `GET /jobs/{job_id}`
- `PATCH /jobs/{job_id}/assign`
- `PATCH /jobs/{job_id}/status`
- `POST /jobs/{job_id}/accept` (handyman role)
- `POST /jobs/{job_id}/complete` (handyman role)
- `POST /jobs/{job_id}/review`
- `GET /jobs/{job_id}/review`
- `PATCH /jobs/{job_id}/review`
- `DELETE /jobs/{job_id}/review`
- `GET /workers/{worker_user_id}/reviews`
- `GET /workers/{worker_user_id}/rating`
- `GET /workers/nearby` (geo query)
- `GET /jobs/nearby` (geo query)

### Files

- `POST /files` (create metadata)
- `POST /files/{file_id}` (upload binary)
- `GET /files` (pagination)
- `PATCH /files/{file_id}` (replace binary)
- `DELETE /files/{file_id}`

### Tasks

- `POST /tasks/task` (rate-limited)
- `GET /tasks/task/{task_id}`

### Tiers & Rate Limits (Admin)

- `POST /tier`
- `GET /tiers` (pagination)
- `GET /tier/{name}`
- `PATCH /tier/{name}`
- `DELETE /tier/{name}`
- `POST /tier/{tier_name}/rate_limit`
- `GET /tier/{tier_name}/rate_limits` (pagination)
- `GET /tier/{tier_name}/rate_limit/{id}`
- `PATCH /tier/{tier_name}/rate_limit/{id}`
- `DELETE /tier/{tier_name}/rate_limit/{id}`

## Usage Examples

### Register (v2) and login (v2)

```bash
curl -sS -X POST http://localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alex","username":"alex01","email":"alex@example.com","password":"strongpassword","role":"customer"}'

curl -sS -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username_or_email":"alex01","password":"strongpassword"}' \
  -c cookies.txt
```

Capture the access token and use it in later calls:

```bash
ACCESS_TOKEN=$(curl -sS -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username_or_email":"alex01","password":"strongpassword"}' | jq -r .access_token)

curl -sS http://localhost:8000/api/v1/user/me/ \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Refresh token

```bash
curl -sS -X POST http://localhost:8000/api/v1/refresh \
  -b cookies.txt
```

### Create a job (customer role)

```bash
curl -sS -X POST http://localhost:8000/api/v1/jobs \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Fix leaking sink","description":"Under-sink leak","service_category_id":1}'
```

### File upload (two-step)

1) Create metadata record:

```bash
FILE_META=$(curl -sS -X POST http://localhost:8000/api/v1/files \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"original_file_name":"photo.jpg","mime_type":"image/jpeg","file_size":1234}')

FILE_ID=$(echo "$FILE_META" | jq -r .id)
```

2) Upload the binary:

```bash
curl -sS -X POST "http://localhost:8000/api/v1/files/$FILE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "upload_file=@./photo.jpg"
```

## Pagination

List endpoints (`/users`, `/workers`, `/files`, `/posts`, `/tiers`, `/rate_limits`) accept page/limit parameters (e.g., `page`, `items_per_page`, `files_per_page`) and return a paginated response containing `data` plus metadata fields.

## Error Responses

Errors follow FastAPI's standard JSON shape (typically containing a `detail` field). Use HTTP status codes to distinguish error types (401/403/404/409/422/429).
