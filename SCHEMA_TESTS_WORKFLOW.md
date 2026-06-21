## Workflow for Testing Schemas

Schema tests should verify that your **Pydantic schemas accept valid data, reject invalid data, apply defaults, enforce constraints, and serialize output correctly**.

---

## 1. Identify the schema you want to test

Start with one schema file, for example:

```plain text
src/app/schemas/service_category.py
```


For each schema, list:

- Required fields
- Optional fields
- Default values
- Field constraints
  - `min_length`
  - `max_length`
  - `gt`
  - `ge`
  - `le`
  - regex patterns
- Enum or literal values
- Whether extra fields are allowed or forbidden
- Any custom validators or serializers

---

## 2. Create or locate the schema test file

Schema tests should usually live under:

```plain text
tests/unit_tests/schema_tests/
```


Example naming pattern:

```plain text
tests/unit_tests/schema_tests/test_service_category.py
tests/unit_tests/schema_tests/test_worker.py
tests/unit_tests/schema_tests/test_auth.py
```


If the test file does not exist, create one using the schema name.

---

## 3. Import the schema and validation error

Most schema tests need the schema class and `ValidationError`.

```python
import pytest
from pydantic import ValidationError

from src.app.schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)
```


---

## 4. Test valid input first

Every schema should have at least one test proving valid data works.

```python
def test_service_category_create_valid():
    payload = ServiceCategoryCreate(
        name="Plumbing",
        description="Pipe installation and repairs",
    )

    assert payload.name == "Plumbing"
    assert payload.description == "Pipe installation and repairs"
```


This confirms the schema can be instantiated with expected data.

---

## 5. Test required fields

If a field is required, test that omitting it raises a validation error.

```python
def test_service_category_create_requires_name():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(description="Pipe installation and repairs")
```


Use this for fields that do not have defaults.

---

## 6. Test optional fields and defaults

If a field is optional or has a default, confirm that behavior.

```python
def test_service_category_create_description_optional():
    payload = ServiceCategoryCreate(name="Plumbing")

    assert payload.name == "Plumbing"
    assert payload.description is None
```


For default lists or dicts, also make sure they do not share mutable state between instances.

```python
def test_default_list_is_not_shared():
    first = SomeSchema()
    second = SomeSchema()

    first.items.append("value")

    assert second.items == []
```


---

## 7. Test field constraints

For every constraint, test both valid and invalid boundaries.

### Minimum length

```python
def test_service_category_name_min_length():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(name="P")
```


### Maximum length

```python
def test_service_category_name_max_length():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(name="x" * 121)
```


### Optional field maximum length

```python
def test_service_category_description_max_length():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(
            name="Plumbing",
            description="x" * 501,
        )
```


Boundary tests are useful:

```python
def test_service_category_name_boundary_lengths():
    ServiceCategoryCreate(name="AB")
    ServiceCategoryCreate(name="x" * 120)
```


---

## 8. Test forbidden extra fields

If the schema uses `extra="forbid"`, verify unknown fields fail.

```python
def test_service_category_create_extra_fields_forbidden():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(
            name="Plumbing",
            description="Pipe installation",
            unexpected_field="not allowed",
        )
```


This is important for create and update schemas that should reject unexpected input.

---

## 9. Test update schemas separately

Update schemas often behave differently from create schemas.

Check whether fields are:

- All required
- All optional
- Partially optional
- Extra fields forbidden

Example:

```python
def test_service_category_update_valid():
    payload = ServiceCategoryUpdate(
        name="Electrical",
        description="Wiring and lighting",
    )

    assert payload.name == "Electrical"
    assert payload.description == "Wiring and lighting"
```


If your update schema is intended to support partial updates, test that fields can be omitted:

```python
def test_service_category_update_partial():
    payload = ServiceCategoryUpdate(description="Updated description")

    assert payload.description == "Updated description"
```


If it does **not** support partial updates, then test that required fields are still required.

---

## 10. Test read/output schemas

Read schemas usually include database-generated fields such as `id`.

```python
def test_service_category_read_valid():
    payload = ServiceCategoryRead(
        id=1,
        name="Plumbing",
        description="Pipe installation",
    )

    assert payload.id == 1
    assert payload.name == "Plumbing"
```


Also test required output fields:

```python
def test_service_category_read_requires_id():
    with pytest.raises(ValidationError):
        ServiceCategoryRead(
            name="Plumbing",
            description="Pipe installation",
        )
```


---

## 11. Test enums, literals, and discriminated unions

For schemas using roles, statuses, or enum values, test:

- Valid values
- Invalid values
- Required discriminator fields

Example workflow:

```python
def test_status_update_valid():
    payload = JobStatusUpdate(status="in_progress")

    assert payload.status.value == "in_progress"
```


Invalid enum value:

```python
def test_status_update_invalid():
    with pytest.raises(ValidationError):
        JobStatusUpdate(status="unknown_status")
```


For discriminated unions, use `TypeAdapter`:

```python
from pydantic import TypeAdapter, ValidationError

adapter = TypeAdapter(RegisterRequest)

with pytest.raises(ValidationError):
    adapter.validate_python({
        "role": "handyman",
        "name": "Handyman One",
    })
```


---

## 12. Test serialization if the schema customizes output

If a schema has serializers, test `model_dump()` or `model_dump_json()`.

```python
def test_timestamp_schema_serializes_datetime():
    payload = TimestampSchema()

    dumped = payload.model_dump()

    assert isinstance(dumped["created_at"], str)
```


If testing JSON output:

```python
def test_timestamp_schema_json_serialization():
    payload = TimestampSchema()

    json_data = payload.model_dump_json()

    assert "created_at" in json_data
```


---

## 13. Check validation error details when useful

You do not always need to inspect the exact error message, but it can be useful for constraints.

```python
def test_invalid_file_size_error_type():
    with pytest.raises(ValidationError) as exc_info:
        FileCreate(
            original_file_name="test.png",
            mime_type="image/png",
            file_size=-1,
        )

    errors = exc_info.value.errors()

    assert any(error["type"] == "greater_than" for error in errors)
```


This is stronger than only checking that an error was raised.

---

## 14. Group tests by schema

Use a test class when a file contains multiple related schema tests.

```python
import pytest
from pydantic import ValidationError

from src.app.schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)


class TestServiceCategorySchemas:
    def test_create_valid(self):
        payload = ServiceCategoryCreate(
            name="Plumbing",
            description="Pipe installation and repairs",
        )

        assert payload.name == "Plumbing"

    def test_create_requires_name(self):
        with pytest.raises(ValidationError):
            ServiceCategoryCreate(description="Pipe installation")

    def test_create_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            ServiceCategoryCreate(
                name="Plumbing",
                description="Pipe installation",
                extra_field="not allowed",
            )
```


---

## 15. Run schema tests only

Run all schema tests:

```shell script
pytest tests/unit_tests/schema_tests
```


Run one schema test file:

```shell script
pytest tests/unit_tests/schema_tests/test_service_category.py
```


Run one test class:

```shell script
pytest tests/unit_tests/schema_tests/test_service_category.py::TestServiceCategorySchemas
```


Run one test method:

```shell script
pytest tests/unit_tests/schema_tests/test_service_category.py::TestServiceCategorySchemas::test_create_valid
```


Use verbose mode:

```shell script
pytest -v tests/unit_tests/schema_tests
```


---

## Recommended checklist per schema

For each schema, cover:

- [ ] Valid payload works
- [ ] Required fields are required
- [ ] Optional fields can be omitted
- [ ] Default values are applied
- [ ] Minimum constraints are enforced
- [ ] Maximum constraints are enforced
- [ ] Enum/literal values are enforced
- [ ] Extra fields are rejected when configured
- [ ] Partial update behavior is correct
- [ ] Read schema includes required output fields
- [ ] Custom validators work
- [ ] Custom serializers produce expected output

---

## Simple schema testing pattern

```python
import pytest
from pydantic import ValidationError

from src.app.schemas.example import ExampleCreate


class TestExampleSchema:
    def test_create_valid(self):
        payload = ExampleCreate(name="Valid Name")

        assert payload.name == "Valid Name"

    def test_create_requires_name(self):
        with pytest.raises(ValidationError):
            ExampleCreate()

    def test_create_rejects_invalid_name(self):
        with pytest.raises(ValidationError):
            ExampleCreate(name="x")

    def test_create_rejects_extra_fields(self):
        with pytest.raises(ValidationError):
            ExampleCreate(
                name="Valid Name",
                extra_field="not allowed",
            )
```


That is the basic workflow: **valid case first, then required fields, optional/default behavior, constraints, extra fields, and serialization if applicable.**