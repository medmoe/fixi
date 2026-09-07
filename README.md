# Fixi

A worker marketplace platform for Algeria — customers post skilled-trade jobs, workers apply, customers accept. Built for the Algerian market with Arabic/French support, DZD pricing, and Chargily Pay integration.

---

## What it does

```
Customer → Post Job → Workers Apply → Customer Accepts → Job Done → Review
```

Customers describe a job (plumbing, electrical, masonry, etc.), set a budget in DA, and pick a location. Workers in the area apply. The customer reviews applications and accepts one. Think Uber for Algerian tradespeople.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + SQLAlchemy 2.0 + Alembic |
| Database | PostgreSQL + PostGIS |
| Auth | JWT (access + refresh tokens via httpOnly cookie) |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| State | Redux Toolkit + React Query |
| Maps | OpenStreetMap + Nominatim |
| Containerization | Docker + Docker Compose |

---

## Running locally

**Prerequisites:** Docker and Docker Compose installed.

```sh
# 1. Clone the repo
git clone <repo-url>
cd fixi

# 2. Copy and configure environment variables
cp src/.env.example src/.env
# Edit src/.env — set POSTGRES_PASSWORD, SECRET_KEY, etc.

# 3. Start all services
docker compose up
```

Services started:
- **Backend API** → `http://localhost:8000`
- **API docs** → `http://localhost:8000/docs` (dev only)
- **Frontend** → `http://localhost:5173`
- **PostgreSQL** → port `5432`

### First-time setup

Run database migrations on first start:

```sh
docker compose run --rm migration
```

### Frontend only (without Docker)

```sh
cd frontend
npm install
npm run dev
```

---

## Project structure

```
fixi/
├── src/                        # FastAPI backend
│   ├── app/
│   │   ├── api/v1/             # Route handlers
│   │   │   ├── auth.py
│   │   │   ├── jobs.py
│   │   │   ├── workers.py
│   │   │   └── users.py
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── core/               # Config, security, DB
│   └── migrations/             # Alembic migration scripts
├── frontend/                   # React + TypeScript app
│   ├── src/
│   │   ├── features/           # Feature-sliced modules
│   │   │   ├── auth/
│   │   │   ├── job/
│   │   │   └── worker/
│   │   ├── pages/
│   │   └── lib/                # API client, utils
│   └── cypress/                # E2E tests
├── documentation/              # Design docs, roadmap
├── docker-compose.yml
└── README.md
```

---

## CI / Quality

Every pull request runs:

| Check | Tool | Workflow |
|---|---|---|
| Linting | Ruff | `linting.yml` |
| Type checking | TypeScript | `type-checking.yml` |
| Backend tests | pytest | `tests.yml` |
| Frontend unit tests | Vitest | `web-tests.yml` |
| E2E tests | Cypress | `cypress.yml` |

---

## API reference

Base URL: `/api/v1`

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register (customer or worker) |
| POST | `/auth/login` | Login — returns access token |
| POST | `/auth/refresh` | Refresh access token via cookie |
| POST | `/auth/logout` | Logout and invalidate session |

### Jobs
| Method | Path | Description |
|---|---|---|
| POST | `/jobs` | Post a new job |
| GET | `/jobs/my` | Customer's own jobs |
| GET | `/jobs` | Browse open jobs (worker view) |
| GET | `/jobs/:id` | Job detail |
| PATCH | `/jobs/:id` | Edit job |
| DELETE | `/jobs/:id` | Delete job |
| POST | `/jobs/:id/apply` | Worker applies |
| GET | `/jobs/:id/applications` | List applications |
| PATCH | `/jobs/:id/applications/:appId` | Accept or reject application |

### Workers
| Method | Path | Description |
|---|---|---|
| GET | `/workers` | Search workers by trade + location |
| GET | `/worker-profile` | Own profile |
| PUT | `/worker-profile` | Update profile |

---

## Environment variables

Key variables in `src/.env`:

```env
# Database
POSTGRES_USER=fixi
POSTGRES_PASSWORD=your_password
POSTGRES_DB=fixi_db
POSTGRES_SERVER=db

# Auth
SECRET_KEY=          # openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
ENVIRONMENT=local    # local | staging | production
```

---

## Documentation

- [ROADMAP.md](documentation/ROADMAP.md) — phased build plan, Algeria-specific decisions, launch checklist
- [FRONTEND_README.md](documentation/FRONTEND_README.md) — frontend architecture details
- [DEVELOPMENT_WORKFLOW.md](documentation/DEVELOPMENT_WORKFLOW.md) — branching, PR process
- [HTTP_CLIENT.md](documentation/HTTP_CLIENT.md) — API client usage

---

## License

MIT
