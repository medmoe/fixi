import pytest
from pydantic import ValidationError

from src.app.schemas.file import FileCreate, FileUpdate


@pytest.mark.unit
class TestFileSchema:
    """ Test File schema validation """

    def test_file_create_valid(self):
        """ Test a valid file creation schema. """
        file_data = {
            "original_file_name": "test.png",
            "mime_type": "image/png",
            "file_size": 1000,
        }
        file = FileCreate(**file_data)
        assert file.original_file_name == file_data["original_file_name"]
        assert file.mime_type == file_data["mime_type"]
        assert file.file_size == file_data["file_size"]

    def test_file_create_invalid_size(self):
        """ Test invalid file creation schema. """
        file_data = {
            "original_file_name": "test.png",
            "mime_type": "image/png",
            "file_size": -1,
        }
        with pytest.raises(ValidationError) as exc_info:
            FileCreate(**file_data)

        errors = exc_info.value.errors()
        assert any(error['type'] == 'greater_than' for error in errors)

    def test_file_update_partial(self):
        """ Test partial file update schema. """
        file_data = {
            "original_file_name": "test.png",
            "mime_type": "image/png",
        }
        file = FileUpdate(**file_data)
        assert file.original_file_name == file_data["original_file_name"]
        assert file.mime_type == file_data["mime_type"]
        assert file.file_size is None
