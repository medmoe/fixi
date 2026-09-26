## CRUD tests workflow

CRUD tests verify that your **database access layer** works correctly.

They sit between:

- **Model tests**: “Does the SQLAlchemy model/table behave correctly?”
- **Schema tests**: “Does Pydantic validation behave correctly?”
- **API/integration tests**: “Does the HTTP endpoint behave correctly?”

CRUD tests answer:

> If I call `crud_x.create()`, `crud_x.get()`, `crud_x.update()`, or `crud_x.delete()`, does it correctly interact with the database?

---

## 1. Pick the CRUD module you want to test

For example:

```plain text
src/app/crud/crud_service_category.py
```


The matching test file should usually be:

```plain text
tests/unit_tests/crud_tests/test_service_category.py
```


The naming convention is:

```plain text
crud_service_category.py -> test_service_category.py
crud_worker.py           -> test_worker.py
crud_files.py            -> test_file.py
```


---

## 2. Know what CRUD tests require

Unlike schema tests, CRUD tests usually need a real database session.

So they typically require:

```python
async_session
```


Example:

```python
async def test_create_service_category(async_session):
    ...
```


Because of that, these tests must be run in an environment where the database is reachable.

If you are running inside Docker Compose, DB host is usually:

```plain text
db
```


If you are running from your local machine, DB host is usually:

```plain text
localhost
```


---

## 3. Basic CRUD test structure

A CRUD test usually follows this pattern:

```plain text
Arrange -> Act -> Assert
```


### Arrange

Prepare the data needed for the test.

```python
category_data = ServiceCategoryCreate(
    name="Plumbing",
    description="Pipe installation and repairs",
)
```


### Act

Call the CRUD method.

```python
created_category = await crud_service_category.create(
    db=async_session,
    object=category_data,
)
```


### Assert

Verify the result.

```python
assert created_category.id is not None
assert created_category.name == "Plumbing"
assert created_category.description == "Pipe installation and repairs"
```


---

## 4. Use async tests

Since your database session is async, CRUD tests should be async.

Use:

```python
@pytest.mark.asyncio
async def test_create_service_category(async_session):
    ...
```


Or, if your project globally supports async tests, the marker may not be needed, but it is usually clearer to include it.

---

## 5. Import what you need

A CRUD test usually imports:

- `pytest`
- `AsyncSession`
- the CRUD object
- the create/update/read schemas
- sometimes the SQLAlchemy model directly

Example:

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_service_category import crud_service_category
from src.app.schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)
```


---

## 6. Test create operation

The create test should verify that the CRUD layer can insert a record.

```python
@pytest.mark.asyncio
async def test_create_service_category(async_session: AsyncSession):
    category_data = ServiceCategoryCreate(
        name="Plumbing",
        description="Pipe installation and repairs",
    )

    created_category = await crud_service_category.create(
        db=async_session,
        object=category_data,
    )

    assert created_category.id is not None
    assert created_category.name == "Plumbing"
    assert created_category.description == "Pipe installation and repairs"
```


This confirms:

- schema data is accepted by CRUD
- insert succeeds
- database generates an ID
- returned object has expected values

---

## 7. Test get by ID

After creating a record, retrieve it by ID.

```python
@pytest.mark.asyncio
async def test_get_service_category_by_id(async_session: AsyncSession):
    category_data = ServiceCategoryCreate(
        name="Electrical",
        description="Wiring and lighting",
    )

    created_category = await crud_service_category.create(
        db=async_session,
        object=category_data,
    )

    retrieved_category = await crud_service_category.get(
        db=async_session,
        id=created_category.id,
        schema_to_select=ServiceCategoryRead,
    )

    assert retrieved_category is not None
    assert retrieved_category["id"] == created_category.id
    assert retrieved_category["name"] == "Electrical"
```


This confirms:

- `get()` can filter by ID
- returned data matches the inserted row
- `schema_to_select` returns the expected selected shape

---

## 8. Test get by unique field

If a model has a unique field, test retrieval by that field.

For service category, `name` is a good candidate.

```python
@pytest.mark.asyncio
async def test_get_service_category_by_name(async_session: AsyncSession):
    category_data = ServiceCategoryCreate(
        name="Cleaning",
        description="Home and office cleaning",
    )

    await crud_service_category.create(
        db=async_session,
        object=category_data,
    )

    retrieved_category = await crud_service_category.get(
        db=async_session,
        name="Cleaning",
        schema_to_select=ServiceCategoryRead,
    )

    assert retrieved_category is not None
    assert retrieved_category["name"] == "Cleaning"
    assert retrieved_category["description"] == "Home and office cleaning"
```


---

## 9. Test update operation

For update tests:

1. Create a record.
2. Send an update schema.
3. Call CRUD update.
4. Fetch the record again.
5. Assert changed fields changed and unchanged fields stayed the same.

```python
@pytest.mark.asyncio
async def test_update_service_category_description(async_session: AsyncSession):
    category_data = ServiceCategoryCreate(
        name="Painting",
        description="Interior painting",
    )

    created_category = await crud_service_category.create(
        db=async_session,
        object=category_data,
    )

    update_data = ServiceCategoryUpdate(
        description="Interior and exterior painting",
    )

    await crud_service_category.update(
        db=async_session,
        object=update_data,
        id=created_category.id,
    )

    updated_category = await crud_service_category.get(
        db=async_session,
        id=created_category.id,
        schema_to_select=ServiceCategoryRead,
    )

    assert updated_category["name"] == "Painting"
    assert updated_category["description"] == "Interior and exterior painting"
```


This is especially important if you support partial updates.

---

## 10. Test update name only

If partial update allows changing only the name, test that too.

```python
@pytest.mark.asyncio
async def test_update_service_category_name_only(async_session: AsyncSession):
    category_data = ServiceCategoryCreate(
        name="Old Category",
        description="Existing description",
    )

    created_category = await crud_service_category.create(
        db=async_session,
        object=category_data,
    )

    update_data = ServiceCategoryUpdate(
        name="New Category",
    )

    await crud_service_category.update(
        db=async_session,
        object=update_data,
        id=created_category.id,
    )

    updated_category = await crud_service_category.get(
        db=async_session,
        id=created_category.id,
        schema_to_select=ServiceCategoryRead,
    )

    assert updated_category["name"] == "New Category"
    assert updated_category["description"] == "Existing description"
```


This verifies partial update behavior from the CRUD layer.

---

## 11. Test delete operation

For delete tests:

1. Create a record.
2. Delete it.
3. Try to fetch it.
4. Assert it no longer exists.

```python
@pytest.mark.asyncio
async def test_delete_service_category(async_session: AsyncSession):
    category_data = ServiceCategoryCreate(
        name="Gardening",
        description="Garden maintenance",
    )

    created_category = await crud_service_category.create(
        db=async_session,
        object=category_data,
    )

    category_id = created_category.id

    await crud_service_category.delete(
        db=async_session,
        id=category_id,
    )

    deleted_category = await crud_service_category.get(
        db=async_session,
        id=category_id,
    )

    assert deleted_category is None
```


---

## 12. Test get multiple records

For list behavior, create several records and call `get_multi()`.

```python
@pytest.mark.asyncio
async def test_get_multi_service_categories(async_session: AsyncSession):
    for i in range(3):
        category_data = ServiceCategoryCreate(
            name=f"Category {i}",
            description=f"Description {i}",
        )

        await crud_service_category.create(
            db=async_session,
            object=category_data,
        )

    result = await crud_service_category.get_multi(
        db=async_session,
        offset=0,
        limit=10,
    )

    assert result["total_count"] >= 3
    assert len(result["data"]) >= 3
```


Use `>=` if your test database may contain other data.

Use exact equality only if your fixture guarantees a clean database for each test.

---

## 13. Test filters

If the CRUD layer supports filters, test them.

```python
@pytest.mark.asyncio
async def test_get_multi_service_categories_filtered_by_name(async_session: AsyncSession):
    await crud_service_category.create(
        db=async_session,
        object=ServiceCategoryCreate(
            name="Unique Plumbing Filter",
            description="Plumbing work",
        ),
    )

    result = await crud_service_category.get_multi(
        db=async_session,
        name="Unique Plumbing Filter",
    )

    assert result["total_count"] >= 1

    for item in result["data"]:
        if isinstance(item, dict):
            assert item["name"] == "Unique Plumbing Filter"
        else:
            assert item.name == "Unique Plumbing Filter"
```


---

## 14. Test exists

If your CRUD object supports `exists()`, test both true and false cases.

```python
@pytest.mark.asyncio
async def test_service_category_exists(async_session: AsyncSession):
    await crud_service_category.create(
        db=async_session,
        object=ServiceCategoryCreate(
            name="Exists Category",
            description="Exists description",
        ),
    )

    exists = await crud_service_category.exists(
        db=async_session,
        name="Exists Category",
    )

    assert exists is True

    missing = await crud_service_category.exists(
        db=async_session,
        name="Definitely Missing Category",
    )

    assert missing is False
```


---

## 15. Test database constraints

CRUD tests can also verify database-level constraints.

For example, if `name` is unique:

```python
import pytest
from sqlalchemy.exc import IntegrityError
```


```python
@pytest.mark.asyncio
async def test_create_duplicate_service_category_name_fails(async_session: AsyncSession):
    category_data = ServiceCategoryCreate(
        name="Duplicate Category",
        description="First",
    )

    await crud_service_category.create(
        db=async_session,
        object=category_data,
    )

    duplicate_data = ServiceCategoryCreate(
        name="Duplicate Category",
        description="Second",
    )

    with pytest.raises(IntegrityError):
        await crud_service_category.create(
            db=async_session,
            object=duplicate_data,
        )

    await async_session.rollback()
```


Important: after an `IntegrityError`, always rollback:

```python
await async_session.rollback()
```


Otherwise, the session remains in a failed transaction state.

---

## 16. Use unique test data

Because CRUD tests write to the database, avoid reusing names like:

```python
"Test Service Category"
```


across multiple tests if the field is unique.

Prefer unique names:

```python
name="CRUD Plumbing Create"
name="CRUD Plumbing Update"
name="CRUD Plumbing Delete"
```


Or generate names:

```python
import uuid

name = f"Category {uuid.uuid4()}"
```


Example:

```python
from uuid import uuid4

category_data = ServiceCategoryCreate(
    name=f"Category {uuid4()}",
    description="Test description",
)
```


This avoids failures caused by duplicate data from previous tests.

---

## 17. Keep CRUD tests focused

CRUD tests should not test:

- HTTP status codes
- authentication
- authorization
- request/response routing
- frontend behavior
- MinIO uploads unless testing file CRUD specifically

Those belong in integration/API tests.

CRUD tests should focus on:

- create
- get
- get_multi
- update
- delete
- exists
- filters
- DB constraints

---

## 18. Suggested CRUD test checklist

For each CRUD module, test:

- [ ] Create valid record
- [ ] Get by ID
- [ ] Get by unique field
- [ ] Get missing record returns `None`
- [ ] Get multiple records
- [ ] Get multiple with pagination
- [ ] Get multiple with filter
- [ ] Update one field
- [ ] Partial update preserves unchanged fields
- [ ] Delete record
- [ ] Deleted record is not found
- [ ] Exists returns `True` for existing record
- [ ] Exists returns `False` for missing record
- [ ] Unique constraint failure if applicable
- [ ] Foreign key constraint behavior if applicable

---

## 19. Suggested service category CRUD test layout

```python
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_service_category import crud_service_category
from src.app.schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)


class TestServiceCategoryCRUD:
    @pytest.mark.asyncio
    async def test_create_service_category(self, async_session: AsyncSession):
        ...

    @pytest.mark.asyncio
    async def test_get_service_category_by_id(self, async_session: AsyncSession):
        ...

    @pytest.mark.asyncio
    async def test_get_service_category_by_name(self, async_session: AsyncSession):
        ...

    @pytest.mark.asyncio
    async def test_update_service_category_description(self, async_session: AsyncSession):
        ...

    @pytest.mark.asyncio
    async def test_update_service_category_name_only(self, async_session: AsyncSession):
        ...

    @pytest.mark.asyncio
    async def test_delete_service_category(self, async_session: AsyncSession):
        ...

    @pytest.mark.asyncio
    async def test_get_multi_service_categories(self, async_session: AsyncSession):
        ...

    @pytest.mark.asyncio
    async def test_service_category_exists(self, async_session: AsyncSession):
        ...

    @pytest.mark.asyncio
    async def test_create_duplicate_service_category_name_fails(self, async_session: AsyncSession):
        ...
```


---

## 20. How to run CRUD tests

Run all CRUD tests:

```shell script
pytest tests/unit_tests/crud_tests -v
```


Run one CRUD test file:

```shell script
pytest tests/unit_tests/crud_tests/test_service_category.py -v
```


Run one test class:

```shell script
pytest tests/unit_tests/crud_tests/test_service_category.py::TestServiceCategoryCRUD -v
```


Run one method:

```shell script
pytest tests/unit_tests/crud_tests/test_service_category.py::TestServiceCategoryCRUD::test_create_service_category -v
```


If your local environment uses Docker service names like `db`, run inside Docker Compose:

```shell script
docker compose run --rm tests tests/unit_tests/crud_tests/test_service_category.py -v
```


---

## 21. CRUD tests vs model tests

Use this separation:

| Test type | What it verifies |
|---|---|
| Model test | SQLAlchemy model/table behavior |
| Schema test | Pydantic validation |
| CRUD test | CRUD helper methods against DB |
| API test | HTTP endpoint behavior |

Example:

### Model test

```plain text
Can the ServiceCategory table store name and description?
```


### Schema test

```plain text
Does ServiceCategoryUpdate allow description-only partial update?
```


### CRUD test

```plain text
Does crud_service_category.update() update description without changing name?
```


### API test

```plain text
Does PATCH /service-categories/{id} update the description and return 200?
```


---

## Short version

When writing CRUD tests:

1. Create required test data.
2. Call the CRUD method.
3. Fetch from DB if needed.
4. Assert the DB result is correct.
5. Test create/get/update/delete/list/exists.
6. Use unique values.
7. Roll back after expected DB errors.
8. Run with a reachable test database.