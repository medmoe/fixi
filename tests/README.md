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