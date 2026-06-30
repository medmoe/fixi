import pytest
from pydantic import ValidationError

from src.app.schemas.auth import RegisterBase


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def valid_payload(**overrides) -> dict:
    """Base valid payload — override any field to test edge cases."""
    return {
        "name": "John Doe",
        "username": "john123",
        "email": "john@example.com",
        "password": "Secure123",
        **overrides,
    }


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

class TestRegisterBaseValidPayload:

    def test_valid_payload_passes(self):
        schema = RegisterBase(**valid_payload())
        assert schema.name == "John Doe"
        assert schema.username == "john123"
        assert schema.email == "john@example.com"

    def test_extra_fields_are_forbidden(self):
        with pytest.raises(ValidationError) as exc:
            RegisterBase(**valid_payload(extra_field="hacked"))
        assert "extra_field" in str(exc.value)


# ---------------------------------------------------------------------------
# name field
# ---------------------------------------------------------------------------

class TestNameField:

    def test_name_too_short(self):
        with pytest.raises(ValidationError) as exc:
            RegisterBase(**valid_payload(name="A"))
        assert "name" in str(exc.value)

    def test_name_too_long(self):
        with pytest.raises(ValidationError) as exc:
            RegisterBase(**valid_payload(name="A" * 31))
        assert "name" in str(exc.value)

    def test_name_with_numbers_fails(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(name="John123"))

    def test_name_with_special_chars_fails(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(name="John@Doe"))

    def test_name_with_spaces_passes(self):
        schema = RegisterBase(**valid_payload(name="John Doe"))
        assert schema.name == "John Doe"

    def test_name_min_boundary_passes(self):
        schema = RegisterBase(**valid_payload(name="Jo"))
        assert schema.name == "Jo"

    def test_name_max_boundary_passes(self):
        schema = RegisterBase(**valid_payload(name="A" * 30))
        assert schema.name is not None


# ---------------------------------------------------------------------------
# username field
# ---------------------------------------------------------------------------

class TestUsernameField:

    def test_username_too_short(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(username="a"))

    def test_username_too_long(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(username="a" * 21))

    def test_username_uppercase_fails(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(username="JohnDoe"))

    def test_username_starts_with_underscore_fails(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(username="_john123"))

    def test_username_ends_with_underscore_fails(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(username="john123_"))

    def test_username_with_underscore_in_middle_passes(self):
        schema = RegisterBase(**valid_payload(username="john_doe"))
        assert schema.username == "john_doe"

    def test_username_alphanumeric_passes(self):
        schema = RegisterBase(**valid_payload(username="john123"))
        assert schema.username == "john123"

    def test_username_special_chars_fails(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(username="john@doe"))


# ---------------------------------------------------------------------------
# email field
# ---------------------------------------------------------------------------

class TestEmailField:

    def test_invalid_email_fails(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(email="not-an-email"))

    def test_email_missing_domain_fails(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(email="john@"))

    def test_valid_email_passes(self):
        schema = RegisterBase(**valid_payload(email="john@example.com"))
        assert schema.email == "john@example.com"


# ---------------------------------------------------------------------------
# password field
# ---------------------------------------------------------------------------

class TestPasswordField:

    def test_password_too_short(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(password="Ab1"))

    def test_password_too_long(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(password="A" * 128 + "1"))  # 128+ chars

    def test_password_no_uppercase_fails(self):
        with pytest.raises(ValidationError) as exc:
            RegisterBase(**valid_payload(password="secure123"))
        assert "uppercase" in str(exc.value).lower()

    def test_password_no_digit_fails(self):
        with pytest.raises(ValidationError) as exc:
            RegisterBase(**valid_payload(password="SecurePass"))
        assert "digit" in str(exc.value).lower()

    def test_password_no_uppercase_and_no_digit_fails(self):
        with pytest.raises(ValidationError):
            RegisterBase(**valid_payload(password="securepass"))

    def test_password_min_boundary_passes(self):
        schema = RegisterBase(**valid_payload(password="Secure1!"))  # exactly 8 chars
        assert schema.password == "Secure1!"

    def test_password_max_boundary_passes(self):
        long_password = "A1" + "a" * 126  # exactly 128 chars
        schema = RegisterBase(**valid_payload(password=long_password))
        assert schema.password == long_password
