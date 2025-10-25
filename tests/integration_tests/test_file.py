import pytest
from httpx import AsyncClient
from src.app.models.user import User

@pytest.mark.integration
class TestCreateFileMetaDataEndpoint:
    """ Test File API endpoints """
    file_data = {
        "file_key": "uploads/test.png",
        "original_file_name": "test.png",
        "mime_type": "image/png",
        "file_size": 1000
    }

    async def test_create_file(self, async_client: AsyncClient, auth_headers: dict, test_user: User):
        """ Test creating a file """
        response = await async_client.post(f"/api/v1/{test_user.username}/file", json=self.file_data, headers=auth_headers)
        assert response.status_code == 201

        data = response.json()
        assert data["file_key"] == self.file_data["file_key"]
        assert data["original_file_name"] == self.file_data["original_file_name"]
        assert data["mime_type"] == self.file_data["mime_type"]
        assert data["file_size"] == self.file_data["file_size"]
        assert data["belongs_to_user_id"] == test_user.id
        assert data["uploaded_at"] is not None
        assert data["id"] is not None
        assert data["public_url"] is not None

    async def test_create_file_with_invalid_username(self, async_client: AsyncClient, auth_headers: dict, test_user: User):
        """ Test creating a file with a non-existent path """
        response = await async_client.post(f"/api/v1/not_valid_username/file", json=self.file_data, headers=auth_headers)
        assert response.status_code == 404

    async def test_create_file_with_invalid_user(self, async_client: AsyncClient, auth_headers: dict, test_user: User, other_user: User):
        """ Test creating a file with a non-existent user """
        response = await async_client.post(f"/api/v1/{other_user.username}/file", json=self.file_data, headers=auth_headers)
        assert response.status_code == 403

    async def test_create_file_with_invalid_data(self, async_client: AsyncClient, auth_headers: dict, test_user: User):
        """ Test creating a file with invalid data """
        file_data_copy = self.file_data.copy()
        del file_data_copy["file_key"]
        response = await async_client.post(f"/api/v1/{test_user.username}/file", json=file_data_copy, headers=auth_headers)
        assert response.status_code == 422

    async def test_create_file_with_duplicate_file_key(self, async_client: AsyncClient, auth_headers: dict, test_user: User):
        """ Test creating a file with a duplicate file key """
        # Create a file
        response = await async_client.post(f"/api/v1/{test_user.username}/file", json=self.file_data, headers=auth_headers)
        assert response.status_code == 201

        # Create another file with the same file key
        response = await async_client.post(f"/api/v1/{test_user.username}/file", json=self.file_data, headers=auth_headers)
        assert response.status_code == 422

    async def test_create_file_with_unauthorized_user(self, async_client: AsyncClient, test_user: User):
        """ Test creating a file with an unauthorized user """
        response = await async_client.post(f"/api/v1/{test_user.username}/file", json=self.file_data)
        assert response.status_code == 401


class TestUploadFileContentEndpoint:
    """ Test file content upload endpoint """

    async def test_upload_file_success(self, async_client: AsyncClient, auth_headers: dict, test_user: User, sample_image_bytes: bytes):
        """ Should upload a file successfully """
        files = {
            "upload_file": (
                "test_image.png",
                sample_image_bytes,
                "image/png"
            )
        }
        response = await async_client.post(f"/api/v1/{test_user.username}/file/upload", files=files, headers=auth_headers)
        print(f"Response: {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert "file_key" in data
        assert data['file_key'].startswith("uploads/")
        assert data['mime_type'] == "image/png"
        assert data['file_size'] == len(sample_image_bytes)
        assert "public_url" in data and data['public_url'].startswith("https://")