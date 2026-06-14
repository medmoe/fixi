import pytest
from pydantic import ValidationError

from src.app.schemas.service_category import ServiceCategoryCreate, ServiceCategoryRead, ServiceCategoryUpdate


def test_service_category_create_valid():
    payload = ServiceCategoryCreate(name="Plumbing", description="Pipe installation and repairs")
    assert payload.name == "Plumbing"
    assert payload.description == "Pipe installation and repairs"


def test_service_category_create_requires_name():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(description="Pipe installation and repairs")


def test_service_category_create_description_is_optional():
    payload = ServiceCategoryCreate(name="Plumbing")
    assert payload.name == "Plumbing"
    assert payload.description is None


def test_service_category_name_min_length():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(name="")


def test_service_category_name_max_length():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(name="a" * 256)


def test_service_category_description_max_length():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(name="Plumbing", description="a" * 501)


def test_service_category_create_extra_fields_forbidden():
    with pytest.raises(ValidationError):
        ServiceCategoryCreate(name="Plumbing", description="Pipe installation and repairs", extra_field="extra")


def test_service_category_update_valid():
    payload = ServiceCategoryUpdate(name="Electrical", description="Wiring and lighting")

    assert payload.name == "Electrical"
    assert payload.description == "Wiring and lighting"


def test_service_category_update_partial():
    payload = ServiceCategoryUpdate(description="Wiring and lighting")

    assert payload.name is None
    assert payload.description == "Wiring and lighting"


def test_service_category_read_valid():
    payload = ServiceCategoryRead(id=1, name="Plumbing", description="Pipe installation and repairs")

    assert payload.id == 1
    assert payload.name == "Plumbing"
    assert payload.description == "Pipe installation and repairs"


def test_service_category_read_requires_id():
    with pytest.raises(ValidationError):
        ServiceCategoryRead(name="Plumbing", description="Pipe installation and repairs")


def test_service_category_sanitized_name():
    payload = ServiceCategoryCreate(name="    Plumbing       Category       ")
    assert payload.name == "Plumbing Category"
