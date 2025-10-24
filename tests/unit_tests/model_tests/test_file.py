import pytest
from faker import Faker

from src.app.crud.crud_files import crud_files
from src.app.models.files import File
from src.app.models.user import User

fake = Faker()


@pytest.mark.unit
class TestFileModel:
    """ Test File model functionality """
    file_key = f"uploads/{fake.uuid4()}_{fake.file_name(extension='png')}"
    original_file_name = fake.file_name(extension="png")
    file_size = fake.random_int(min=100, max=5_000_000)

    async def test_file_creation(self, async_session, test_user: User):
        """ Test creating a file """
        file = self._get_file_object(test_user)

        async_session.add(file)
        await async_session.commit()
        await async_session.refresh(file)

        assert file.id is not None
        assert file.file_key == self.file_key
        assert file.original_file_name == self.original_file_name
        assert file.mime_type == "image/png"
        assert file.file_size == self.file_size
        assert file.uploaded_at is not None
        assert file.belongs_to_user_id == test_user.id

    async def test_file_relationships(self, async_session, test_user: User):
        """ Test file relationships """
        file = self._get_file_object(test_user)
        async_session.add(file)
        await async_session.commit()

        # Test relationship
        await async_session.refresh(test_user)
        files = await crud_files.get_multi(db=async_session, belongs_to_user_id=test_user.id)
        assert files['total_count'] == 1
        assert files['data'][0]['belongs_to_user_id'] == test_user.id

    def _get_file_object(self, test_user: User):
        return File(
            file_key=self.file_key,
            original_file_name=self.original_file_name,
            mime_type="image/png",
            file_size=self.file_size,
            belongs_to_user_id=test_user.id
        )
