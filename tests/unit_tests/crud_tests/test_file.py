import pytest

from src.app.crud.crud_files import crud_files
from src.app.models.user import User
from src.app.schemas.file import FileCreateInternal


@pytest.mark.unit
class TestFileCRUD:
    """ Test File CRUD operations """

    async def test_create_file(self, async_session, test_user: User):
        """ Test creating a file """
        file_data = FileCreateInternal(
            file_key="uploads/test.png",
            original_file_name="test.png",
            mime_type="image/png",
            file_size=1000,
            belongs_to_user_id=test_user.id
        )

        file = await crud_files.create(db=async_session, object=file_data)

        assert file.file_key == file_data.file_key
        assert file.original_file_name == file_data.original_file_name
        assert file.mime_type == file_data.mime_type
        assert file.file_size == file_data.file_size

    async def test_get_by_files_by_user(self, async_session, test_user: User):
        """ Test getting files by user """
        # Create multiple files
        for i in range(3):
            file_data = FileCreateInternal(
                file_key=f"uploads/test{i}.png",
                original_file_name=f"test{i}.png",
                mime_type="image/png",
                file_size=1000,
                belongs_to_user_id=test_user.id
            )
            await crud_files.create(db=async_session, object=file_data)

        # Get files by user
        result = await crud_files.get_multi(db=async_session, belongs_to_user_id=test_user.id)
        assert len(result['data']) == 3
        assert result['total_count'] == 3
