import pytest
from pydantic import TypeAdapter, ValidationError

from src.app.schemas.auth import RegisterCustomer, RegisterHandyman, RegisterRequest


class TestAuthSchemas:
    def test_register_customer_schema_valid(self):
        payload = RegisterCustomer(
            name="Customer One",
            username="customerone",
            email="customer.one@example.com",
            password="StrongPass123!",
            role="customer",
            saved_addresses=["123 Main St"],
            loyalty_points=5,
        )
        assert payload.role.value == "customer"
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
                    "role": "handyman",
                    "hourly_rate": 80.0,
                }
            )

    def test_register_handyman_schema_valid(self):
        payload = RegisterHandyman(
            name="Handyman Two",
            username="handymantwo",
            email="handyman.two@example.com",
            password="StrongPass123!",
            role="handyman",
            skill_category="Electrical",
            skills=["wiring"],
            hourly_rate=95.0,
        )
        assert payload.role.value == "handyman"
        assert payload.skill_category == "Electrical"
