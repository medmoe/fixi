

# Common FastAPI Backend Development Workflow

This guide explains a common workflow for developing API backends with FastAPI, using this project structure as a reference.

The backend in this project follows a common layered architecture:
```
text
src/app/
  api/
    v1/
      *.py              # API route files
  models/
    *.py                # SQLAlchemy database models
  schemas/
    *.py                # Pydantic request/response schemas
  crud/
    *.py                # Database access helpers / CRUD layer
  core/
    *.py                # Config, database, security, exceptions, shared infrastructure
  services/
    *.py                # Business logic services, if needed
  main.py               # FastAPI app setup and router registration
tests/
  *.py                  # Backend tests
```
---

## 1. Start With the Feature Requirement

Before writing code, define the API feature clearly.

Example feature:

> Add service category endpoints so clients can list available handyman service categories.

Clarify:

- What resource is being created or read?
- What endpoint path should be used?
- Who can access it?
- What request body is expected?
- What response shape should be returned?
- What errors are possible?

Example endpoint plan:
```
text
GET /api/v1/service-categories
Returns all service categories.
Public endpoint.
Response: list of service category objects.
```
For protected endpoints, also define the required role:
```
text
POST /api/v1/service-categories
Creates a new service category.
Only superusers/admins can access it.
```
---

## 2. Create or Update the Database Model

Database models live in:
```
text
src/app/models/
```
A model represents the database table structure.

Example model shape:
```
python
class ServiceCategory(Base):
    __tablename__ = "service_category"

    id: Mapped[int] = mapped_column(primary_key=True, init=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(500), default=None)
```
The model is responsible for database-level structure:

- table name
- columns
- column types
- nullable fields
- indexes
- unique constraints
- foreign keys
- database constraints

Common rule:

> SQLAlchemy models describe the database. They should not be used as public API response contracts.

---

## 3. Create or Update Pydantic Schemas

Schemas live in:
```
text
src/app/schemas/
```
Schemas define the public API contract.

Usually, each resource has several schemas:
```
text
ServiceCategoryCreate
ServiceCategoryRead
ServiceCategoryUpdate
ServiceCategoryUpdateInternal
ServiceCategoryDelete
```
Common schema purposes:

| Schema | Purpose |
|---|---|
| `Create` | Fields accepted when creating a record |
| `Read` | Fields returned to the client |
| `Update` | Fields accepted from client updates |
| `UpdateInternal` | Fields used internally by backend logic |
| `Delete` | Fields related to delete operations, if needed |

Example:
```
python
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated


class ServiceCategoryBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=120)]
    description: Annotated[str | None, Field(max_length=500)] = None


class ServiceCategoryCreate(ServiceCategoryBase):
    model_config = ConfigDict(extra="forbid")


class ServiceCategoryRead(ServiceCategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
```
Important practices:

- Use schemas for `response_model`.
- Do not expose SQLAlchemy models directly as response models.
- Use validation constraints with `Field`.
- Use `extra="forbid"` for strict request bodies when appropriate.
- Use `from_attributes=True` when converting from ORM objects.

---

## 4. Add CRUD Layer

CRUD files live in:
```
text
src/app/crud/
```
The CRUD layer isolates database access from route functions.

In this project, CRUD helpers commonly use `FastCRUD`.

Example pattern:
```
python
from fastcrud import FastCRUD

from ..models import ServiceCategory
from ..schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
    ServiceCategoryUpdateInternal,
    ServiceCategoryDelete,
)


CRUDServiceCategory = FastCRUD[
    ServiceCategory,
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
    ServiceCategoryUpdateInternal,
    ServiceCategoryDelete,
    ServiceCategoryRead,
]

crud_service_category = CRUDServiceCategory(ServiceCategory)
```
The route layer should usually call CRUD methods rather than directly performing database operations everywhere.

Good:
```
python
categories = await crud_service_category.get_multi(db=db)
```
Less ideal for repeated patterns:
```
python
result = await db.execute(select(ServiceCategory))
categories = result.scalars().all()
```
Direct SQLAlchemy queries are still fine when:

- the query is custom,
- the logic is endpoint-specific,
- the CRUD helper does not support the needed query cleanly.

---

## 5. Create the API Router

Route files live in:
```
text
src/app/api/v1/
```
A router groups related endpoints.

Example:
```
python
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...crud.crud_service_category import crud_service_category
from ...schemas.service_category import ServiceCategoryRead

router = APIRouter(
    prefix="/service-categories",
    tags=["Service Categories"],
)


@router.get("/", response_model=list[ServiceCategoryRead])
async def get_service_categories(
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[ServiceCategoryRead]:
    return await crud_service_category.get_multi(db=db)
```
Common router arguments:
```
python
router = APIRouter(
    prefix="/service-categories",
    tags=["Service Categories"],
)
```
Meaning:

| Argument | Purpose |
|---|---|
| `prefix` | Adds a common URL prefix to every route in the router |
| `tags` | Groups endpoints in Swagger/OpenAPI docs |
| `dependencies` | Applies dependencies to every route |
| `responses` | Adds shared response documentation |
| `include_in_schema` | Controls whether endpoints appear in `/docs` |

---

## 6. Always Inject the Database Session

For async SQLAlchemy, routes usually need an `AsyncSession`.

Common pattern:
```
python
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db


async def endpoint(
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    ...
```
Then pass the session to the CRUD layer:
```
python
return await crud_service_category.get_multi(db=db)
```
Avoid creating database sessions manually inside endpoints unless there is a specific reason.

---

## 7. Use `response_model` Correctly

Use Pydantic schemas as response models.

Good:
```
python
@router.get("/", response_model=list[ServiceCategoryRead])
```
Avoid:
```
python
@router.get("/", response_model=list[ServiceCategory])
```
Why?

`ServiceCategory` is a SQLAlchemy database model. It may contain internal fields, relationships, lazy-loading behavior, or implementation details that should not define your public API.

`ServiceCategoryRead` is the API contract. It explicitly says what the client receives.

---

## 8. Add Authentication and Authorization When Needed

Authentication and authorization logic usually belongs in dependencies.

Example pattern:
```
python
from typing import Annotated

from fastapi import Depends

from ...api.dependencies import get_current_superuser


@router.post("/", response_model=ServiceCategoryRead, status_code=201)
async def create_service_category(
    payload: ServiceCategoryCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    _: Annotated[dict, Depends(get_current_superuser)],
) -> ServiceCategoryRead:
    ...
```
For role-based checks, use dependencies such as:
```
python
Depends(require_role(...))
```
Common authorization rules:

| Endpoint | Access |
|---|---|
| `GET` list/read public resources | Public or authenticated |
| `POST` create admin resources | Admin/superuser |
| `PATCH` update resources | Owner/admin |
| `DELETE` resources | Owner/admin/superuser |

---

## 9. Handle Errors Consistently

Use project-level custom exceptions when available.

Examples:
```
python
raise DuplicateValueException("Service category name already exists")
```

```
python
raise UnauthorizedException("Wrong username, email or password.")
```
Common HTTP statuses:

| Status | Meaning |
|---|---|
| `200` | Successful read/update |
| `201` | Created |
| `204` | Deleted successfully, no body |
| `400` | Bad request |
| `401` | Not authenticated |
| `403` | Authenticated but not allowed |
| `404` | Not found |
| `409` | Conflict/duplicate |
| `422` | Validation error |

FastAPI automatically returns `422` when request validation fails.

---

## 10. Register the Router in the App

After creating a router file, include it in the main application or versioned API setup.

Common pattern:
```
python
from fastapi import FastAPI

from app.api.v1 import service_categories

app = FastAPI()

app.include_router(service_categories.router, prefix="/api/v1")
```
Depending on the project structure, there may be a central `api/v1/__init__.py` or main router where all route modules are included.

The final path is usually:
```
text
global prefix + router prefix + route path
```
Example:
```
python
app.include_router(router, prefix="/api/v1")
```
Router:
```
python
router = APIRouter(prefix="/service-categories")
```
Route:
```
python
@router.get("/")
```
Final URL:
```
text
GET /api/v1/service-categories/
```
---

## 11. Create a Database Migration

When a model changes, create an Alembic migration.

This project has Alembic under:
```
text
src/migrations/
src/alembic.ini
```
Common migration workflow:
```
bash
cd src
alembic revision --autogenerate -m "add service category table"
alembic upgrade head
```
If using Docker Compose, this project has a `migration` service, so migration commands may be run through Docker depending on the development setup.

Example:
```
bash
docker compose run --rm migration revision --autogenerate -m "add service category table"
docker compose run --rm migration upgrade head
```
After generating a migration, always inspect it before applying it.

Check for:

- correct table name,
- correct columns,
- correct indexes,
- correct foreign keys,
- no accidental table drops,
- no unrelated changes.

---

## 12. Add Tests

Tests live in:
```
text
tests/
```
Use tests to verify:

- successful responses,
- validation errors,
- authentication behavior,
- authorization behavior,
- not-found cases,
- duplicate/conflict cases,
- database state changes.

Example API test:
```
python
import pytest


@pytest.mark.asyncio
async def test_list_service_categories(async_client):
    response = await async_client.get("/api/v1/service-categories/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)
```
Example validation test:
```
python
import pytest


@pytest.mark.asyncio
async def test_create_service_category_rejects_empty_name(async_client, superuser_token):
    response = await async_client.post(
        "/api/v1/service-categories/",
        json={"name": "", "description": "Invalid"},
        headers={"Authorization": f"Bearer {superuser_token}"},
    )

    assert response.status_code == 422
```
Example not-found test:
```
python
import pytest


@pytest.mark.asyncio
async def test_get_service_category_not_found(async_client):
    response = await async_client.get("/api/v1/service-categories/999999")

    assert response.status_code == 404
```
---

## 13. Run the App Locally

This project uses Docker Compose for local development.

Common command:
```
bash
docker compose up web db redis
```
The backend is served with Uvicorn:
```
bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API is commonly available at:
```
text
http://localhost:8000
```
Swagger docs:
```
text
http://localhost:8000/docs
```
OpenAPI schema:
```
text
http://localhost:8000/openapi.json
```
---

## 14. Run Tests

This project has a Docker Compose `tests` service.

Common command:
```
bash
docker compose run --rm tests
```
Or, if running locally inside the configured Python environment:
```
bash
pytest
```
For a specific test file:
```
bash
pytest tests/test_auth_v2.py
```
For a specific test:
```
bash
pytest tests/test_auth_v2.py::TestAuthV2::test_register_customer_success
```
---

## 15. Connect the Frontend

The frontend talks to the backend using the configured API base URL.

Typical frontend base URL:
```
text
http://localhost:8000/api/v1
```
When adding backend endpoints, make sure the frontend uses the same final path.

Example backend endpoint:
```
text
GET /api/v1/service-categories/
```
Frontend request path with base URL `/api/v1`:
```
text
/service-categories/
```
For TypeScript, mirror backend read/create schemas with frontend types.

Example:
```
typescript
export interface ServiceCategoryRead {
  id: number;
  name: string;
  description?: string | null;
}
```
Keep frontend types aligned with backend Pydantic schemas.

---

## 16. Recommended Order for Adding a New Resource

For a typical new feature, use this order:

1. Define the endpoint behavior.
2. Add or update the SQLAlchemy model in `src/app/models/`.
3. Add or update Pydantic schemas in `src/app/schemas/`.
4. Add or update CRUD helper in `src/app/crud/`.
5. Add API routes in `src/app/api/v1/`.
6. Register the router in the app.
7. Create and review Alembic migration.
8. Apply the migration.
9. Add tests.
10. Run tests.
11. Check `/docs`.
12. Connect frontend types and API calls.

---

## 17. Example: Service Category Workflow

### Step 1: Model

Create the database table model in:
```
text
src/app/models/service_category.py
```
The model defines fields such as:
```
text
id
name
description
```
### Step 2: Schema

Create API schemas in:
```
text
src/app/schemas/service_category.py
```
Typical schemas:
```
text
ServiceCategoryCreate
ServiceCategoryRead
ServiceCategoryUpdate
ServiceCategoryUpdateInternal
ServiceCategoryDelete
```
### Step 3: CRUD

Create CRUD helper in:
```
text
src/app/crud/crud_service_category.py
```
The CRUD helper wraps common database operations.

### Step 4: Router

Create route handlers in:
```
text
src/app/api/v1/service_categories.py
```
Example endpoints:
```
text
GET /api/v1/service-categories/
POST /api/v1/service-categories/
GET /api/v1/service-categories/{category_id}
PATCH /api/v1/service-categories/{category_id}
DELETE /api/v1/service-categories/{category_id}
```
### Step 5: Tests

Add tests such as:
```
text
tests/test_service_categories.py
```
Test:

- listing categories,
- creating category,
- duplicate category name,
- retrieving one category,
- updating category,
- deleting category,
- authorization rules.

---

## 18. Common Endpoint Patterns

### List Resources
```
python
@router.get("/", response_model=list[ServiceCategoryRead])
async def list_service_categories(
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[ServiceCategoryRead]:
    return await crud_service_category.get_multi(db=db)
```
### Get One Resource
```
python
@router.get("/{category_id}", response_model=ServiceCategoryRead)
async def get_service_category(
    category_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ServiceCategoryRead:
    category = await crud_service_category.get(
        db=db,
        id=category_id,
        schema_to_select=ServiceCategoryRead,
    )

    if category is None:
        raise NotFoundException("Service category not found")

    return category
```
### Create Resource
```
python
@router.post("/", response_model=ServiceCategoryRead, status_code=201)
async def create_service_category(
    payload: ServiceCategoryCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    _: Annotated[dict, Depends(get_current_superuser)],
) -> ServiceCategoryRead:
    return await crud_service_category.create(
        db=db,
        object=payload,
    )
```
### Update Resource
```
python
@router.patch("/{category_id}", response_model=ServiceCategoryRead)
async def update_service_category(
    category_id: int,
    payload: ServiceCategoryUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    _: Annotated[dict, Depends(get_current_superuser)],
) -> ServiceCategoryRead:
    updated = await crud_service_category.update(
        db=db,
        object=payload,
        id=category_id,
    )

    if updated is None:
        raise NotFoundException("Service category not found")

    return updated
```
### Delete Resource
```
python
@router.delete("/{category_id}", status_code=204)
async def delete_service_category(
    category_id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    _: Annotated[dict, Depends(get_current_superuser)],
) -> None:
    deleted = await crud_service_category.delete(
        db=db,
        id=category_id,
    )

    if deleted is None:
        raise NotFoundException("Service category not found")

    return None
```
Method names may vary depending on the exact CRUD helper/library API. Always check the existing CRUD usage in this project before copying a pattern.

---

## 19. Common Mistakes to Avoid

### Using SQLAlchemy Models as Response Models

Avoid:
```
python
@router.get("/", response_model=list[ServiceCategory])
```
Prefer:
```
python
@router.get("/", response_model=list[ServiceCategoryRead])
```
---

### Forgetting the Database Session

Avoid:
```
python
async def list_categories():
    return await crud_service_category.get_multi()
```
Prefer:
```
python
async def list_categories(
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    return await crud_service_category.get_multi(db=db)
```
---

### Mixing Business Logic Into Routes

Avoid putting too much logic inside route functions.

If the operation is complex, move logic into:
```
text
src/app/services/
```
Route functions should mostly:

1. receive request,
2. validate permissions,
3. call CRUD/service layer,
4. return response.

---

### Returning Raw Internal Data

Avoid returning sensitive or internal fields.

For example, never expose:
```
text
hashed_password
token_version
internal flags
private system fields
```
Only expose fields defined in read schemas.

---

### Forgetting Router Registration

Creating a router file is not enough. It must be included in the FastAPI app.

If the route does not appear in `/docs`, check:

- Is the router imported?
- Is `include_router()` called?
- Is `include_in_schema=False` set?
- Is the app running the latest code?

---

### Forgetting Migrations

Changing a SQLAlchemy model does not automatically update the database.

After model changes:
```
bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```
---

## 20. Recommended Conventions

### File Naming

Use plural names for route files:
```
text
service_categories.py
users.py
posts.py
reviews.py
```
Use singular names for model/schema files when they represent one resource:
```
text
service_category.py
user.py
post.py
review.py
```
### Router Naming

Use:
```
python
router = APIRouter(...)
```
This is common and simple.

### Tags

Use readable tags:
```
python
tags=["Service Categories"]
```
or lowercase API-style tags:
```
python
tags=["service-categories"]
```
Be consistent across the project.

### Prefixes

Use resource-style prefixes:
```
python
prefix="/service-categories"
```
Then define routes relative to that prefix:
```
python
@router.get("/")
@router.post("/")
@router.get("/{category_id}")
@router.patch("/{category_id}")
@router.delete("/{category_id}")
```
### Type Hints

Prefer modern Python type hints:
```
python
list[ServiceCategoryRead]
```
instead of:
```
python
List[ServiceCategoryRead]
```
Both work, but `list[...]` is the modern style.

### Dependency Style

Prefer `Annotated` for FastAPI dependencies:
```
python
db: Annotated[AsyncSession, Depends(async_get_db)]
```
This keeps the actual type clear.

---

## 21. Backend Development Checklist

Before opening a pull request or considering the feature done, verify:

- [ ] Requirement is clear.
- [ ] SQLAlchemy model is correct.
- [ ] Pydantic schemas are correct.
- [ ] CRUD layer exists or direct query is justified.
- [ ] Router endpoints are implemented.
- [ ] Router is registered.
- [ ] Correct `response_model` is used.
- [ ] Database session is injected with `Depends`.
- [ ] Authentication/authorization is applied where needed.
- [ ] Custom exceptions are used consistently.
- [ ] Alembic migration is generated and reviewed.
- [ ] Tests are added.
- [ ] Tests pass.
- [ ] Endpoint appears correctly in `/docs`.
- [ ] Frontend API path and types are aligned if frontend is affected.

---

## 22. Quick Mental Model

A clean FastAPI backend usually separates responsibilities like this:
```
text
Request
  ↓
API router
  ↓
Pydantic schema validation
  ↓
Auth dependencies
  ↓
Service layer or CRUD layer
  ↓
SQLAlchemy model/database
  ↓
Pydantic response schema
  ↓
Response
```
In short:

- `models/` are for the database.
- `schemas/` are for API input/output.
- `crud/` is for reusable database operations.
- `api/v1/` is for HTTP endpoints.
- `core/` is for shared infrastructure.
- `services/` is for business logic.
- `tests/` verifies everything works.

This separation keeps the backend easier to understand, test, and maintain.

