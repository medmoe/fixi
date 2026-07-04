## The template structure

```
Docstring          → what file tests and which schemas
Fixtures           → shared factories at the top
Per-schema class   → one class per schema (TestWorkerProfileCreate etc.)
  Per-field class  → nested class per field (TestBioField etc.)
  Happy path first → always start with what should work
  Edge cases next  → boundaries, nulls, empty values
  Security last    → extra fields, forbidden fields
```

The key habit is **nested classes by field** inside each schema class — when a test fails you immediately know which schema and which field broke, without reading the test name carefully.

---

## The mental model for each layer

```
Model tests       → does the DB enforce the rules ?
                    (constraints, nulls, FKs, cascades)

Schema tests      → does Pydantic validate the data correctly ?
                    (field rules, defaults, security, ORM mode)

CRUD tests        → do the DB queries work correctly ?
                    (create/read/update/delete against real test DB)

Integration tests → does the full HTTP cycle work end to end ?
                    (auth, routing, response shape, status codes)
```

Each layer tests **only its own responsibility** — model tests don't call HTTP endpoints, integration tests don't test Pydantic field lengths.

---

## The testing pyramid for the project

```
                    ┌─────────────────┐
                    │   Integration   │  ← real services (db, redis, minio)
                    │     Tests       │    test the full HTTP request/response cycle
                    └─────────────────┘
              ┌───────────────────────────┐
              │       Unit Tests          │  ← real DB, mocked external services
              │  (CRUD, schemas, logic)   │    test business logic in isolation
              └───────────────────────────┘
        ┌───────────────────────────────────────┐
        │           Schema Tests                │  ← no services needed
        │    (Pydantic validation only)         │    pure Python, instant
        └───────────────────────────────────────┘
```

---

## What each layer uses

| Layer | DB | Redis | MinIO | Purpose |
|---|---|---|---|---|
| Schema tests | ❌ | ❌ | ❌ | validate Pydantic shapes, constraints |
| Unit tests (CRUD) | ✅ real | ❌ mocked | ❌ mocked | business logic, DB queries |
| Integration tests | ✅ real | ✅ real | ✅ real | full HTTP cycle, auth, rate limiting |

---

## What this means practically

**Schema tests** — pure Python, no fixtures needed:
```python
def test_hourly_rate_must_be_positive():
    with pytest.raises(ValidationError):
        WorkerProfileCreate(hourly_rate=-1, ...)
```

**Unit tests (CRUD)** — real DB, mock everything else:
```python
async def test_create_worker_profile(async_session):
    # real DB, rate limiter overridden to None, no MinIO
    profile = await crud_workers.create(db=async_session, object=schema)
    assert profile.id is not None
```

**Integration tests** — all services running:
```python
async def test_toggle_availability_rate_limited(async_client_with_redis):
    # real HTTP request → real DB → real Redis rate limiter
    # this is the only place you test the actual rate limiting behavior
    for _ in range(11):
        response = await async_client_with_redis.patch(...)
    assert response.status_code == 429
```

---

## The key insight

```
Unit tests answer:    "does my business logic work?"
Integration tests answer: "does the full system work together?"
```

Most of your tests should be unit tests — they're fast, isolated, and don't depend on infrastructure. Integration tests are fewer but cover the things unit tests can't — auth flow, rate limiting, cookie handling, file upload to MinIO, end-to-end request/response shape.

Your current setup already follows this correctly:
- `async_client` — overrides rate limiter, used for most integration tests
- `async_client_with_redis` — real Redis, used only for rate limit behavior tests
- `async_session` — real DB, used in unit tests

The only refinement is being intentional about **which tests actually need real Redis** — and that's only tests that specifically verify rate limiting behavior, not every integration test.