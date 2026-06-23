import pytest
from pydantic import TypeAdapter, ValidationError

from src.app.schemas.auth import RegisterCustomer, RegisterHandyman, RegisterRequest
from src.app.models import UserRole


class TestAuthSchemas:
    def test_register_customer_schema_valid(self):
        payload = RegisterCustomer(
            name="Customer One",
            username="customerone",
            email="customer.one@example.com",
            password="StrongPass123!",
            role=UserRole.customer,
            saved_addresses=["123 Main St"],
            loyalty_points=5,
        )
        assert payload.role.value == UserRole.customer.value
        assert payload.loyalty_points == 5

    def test_register_handyman_schema_requires_skill_category(self):
        adapter = TypeAdapter(RegisterRequest)

        with pytest.raises(ValidationError):
            adapter.validate_python(
                {
                    "name": "Handyman One",
                    "username": "handymanone",
                    "email": "handyman.one@example.com",
                    "password": "StrongPass123!",
                    "role": UserRole.worker,
                    "hourly_rate": 80.0,
                }
            )

    def test_register_handyman_schema_valid(self):
        payload = RegisterHandyman(
            name="Handyman Two",
            username="handymantwo",
            email="handyman.two@example.com",
            password="StrongPass123!",
            role=UserRole.worker,
            skill_category="Electrical",
            skills=["wiring"],
            hourly_rate=95.0,
        )
        assert payload.role.value == "worker"
        assert payload.skill_category == "Electrical"
