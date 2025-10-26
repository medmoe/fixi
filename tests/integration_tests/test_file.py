import pytest
from httpx import AsyncClient

from src.app.models.user import User
from tests.conftest import sample_image_bytes


@pytest.mark.integration
class TestCreateFileMetaDataEndpoint:
    """ Test File API endpoints """
    file_data = {
        "original_file_name": "test.png",
        "mime_type": "image/png",
        "file_size": 1000
    }

    async def test_create_file(self, async_client: AsyncClient, auth_headers: dict, test_user: User):
        """ Test creating a file """
        response = await async_client.post(f"/api/v1/{test_user.username}/file", json=self.file_data, headers=auth_headers)
        assert response.status_code == 201

        data = response.json()
        assert data["original_file_name"] == self.file_data["original_file_name"]
        assert data["mime_type"] == self.file_data["mime_type"]
        assert data["file_size"] == self.file_data["file_size"]
        assert data["belongs_to_user_id"] == test_user.id
        assert data["uploaded_at"] is not None
        assert data["id"] is not None

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
        del file_data_copy["file_size"]
        response = await async_client.post(f"/api/v1/{test_user.username}/file", json=file_data_copy, headers=auth_headers)
        assert response.status_code == 422

    async def test_create_file_with_unauthorized_user(self, async_client: AsyncClient, test_user: User):
        """ Test creating a file with an unauthorized user """
        response = await async_client.post(f"/api/v1/{test_user.username}/file", json=self.file_data)
        assert response.status_code == 401


class TestUploadFileContentEndpoint:
    """ Test file content upload endpoint """
    file_metadata = {"original_file_name": "test.png", "mime_type": "image/png", "file_size": 1000}

    async def create_file_metadata(self, async_client: AsyncClient, auth_headers: dict, test_user: User):
        response = await async_client.post(f"/api/v1/{test_user.username}/file", json=self.file_metadata, headers=auth_headers)
        assert response.status_code == 201
        return response.json()

    async def test_upload_file_success(self, async_client: AsyncClient, auth_headers: dict, test_user: User, sample_image_bytes: bytes):
        """ Should upload a file successfully """
        file = {"upload_file": ("test.png", sample_image_bytes, "image/png")}
        created_file_data = await self.create_file_metadata(async_client, auth_headers, test_user)
        response = await async_client.post(f"/api/v1/{created_file_data['id']}/upload", files=file, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert 'url' in data and data['url'] is not None

    async def test_upload_file_with_invalid_extension(self, async_client: AsyncClient, auth_headers: dict, sample_image_bytes, test_user: User):
        file = {"upload_file": ("test.js", sample_image_bytes, "image/png")}
        created_file_metadata = await self.create_file_metadata(async_client, auth_headers, test_user)
        response = await async_client.post(f"/api/v1/{created_file_metadata['id']}/upload", files=file, headers=auth_headers)
        print(f"Extension: {response.json()}")
        assert response.status_code == 400

    async def test_upload_file_with_invalid_mime_type(self, async_client: AsyncClient, auth_headers: dict, test_user: User, sample_invalid_image_bytes: bytes):
        file = {"upload_file": ("test.png", sample_invalid_image_bytes, "invalid/mime")}
        created_file_metadata = await self.create_file_metadata(async_client, auth_headers, test_user)
        response = await async_client.post(f"/api/v1/{created_file_metadata['id']}/upload", files=file, headers=auth_headers)
        print(f"Mime Type: {response.json()}")
        assert response.status_code == 400

    async def test_upload_file_with_invalid_image(self, async_client: AsyncClient, auth_headers: dict, test_user: User, sample_invalid_image_bytes):
        file = {"upload_file": ("test.png", sample_invalid_image_bytes, "image/png")}
        created_file_metadata = await self.create_file_metadata(async_client, auth_headers, test_user)
        response = await async_client.post(f"/api/v1/{created_file_metadata['id']}/upload", files=file, headers=auth_headers)
        print(f"Invalid Image: {response.json()}")
        assert response.status_code == 400

    async def test_upload_file_when_storage_fail(self, async_client: AsyncClient, auth_headers: dict, test_user: User, sample_image_bytes, monkeypatch):
        file = {"upload_file": ("test.png", sample_image_bytes, "image/png")}
        created_file_metadata = await self.create_file_metadata(async_client, auth_headers, test_user)

        # monkey-patch the minio_client.upload_file to raise an exception
        monkeypatch.setattr("src.app.api.v1.files.minio_client.upload_file", lambda *args, **kwargs: (_ for _ in ()).throw(Exception("upload file failed")))
        response = await async_client.post(f"/api/v1/{created_file_metadata['id']}/upload", files=file, headers=auth_headers)
        assert response.status_code == 500


class TestGettingFilesEndpoint:
    """ Test getting files endpoint """

    async def create_sample_files(self, async_client: AsyncClient,
                                  test_user: User,
                                  auth_headers: dict,
                                  sample_image_bytes: bytes,
                                  files_count: int = 5):
        file_metadata = {"original_file_name": "test.png", "mime_type": "image/png", "file_size": 1000}

        # Create some files
        for i in range(files_count):
            file_metadata['original_file_name'] = f"file_{i}"
            response = await async_client.post(f"/api/v1/{test_user.username}/file", json=file_metadata, headers=auth_headers)
            assert response.status_code == 201
            data = response.json()
            file = {"upload_file": (f"test_{i}.png", sample_image_bytes, "image/png")}
            response = await async_client.post(f"/api/v1/{data['id']}/upload", files=file, headers=auth_headers)
            assert response.status_code == 200

    async def test_getting_files_success(self, async_client: AsyncClient,
                                         auth_headers: dict,
                                         sample_image_bytes: bytes,
                                         test_user: User,
                                         cleanup_minio_bucket):
        await self.create_sample_files(async_client, test_user, auth_headers, sample_image_bytes)
        response = await async_client.get("/api/v1/files", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data['total_count'] == 5
        assert len(data['data']) == 5

    async def test_getting_own_files_only(self,
                                          async_client: AsyncClient,
                                          auth_headers: dict,
                                          other_auth_headers: dict,
                                          test_user: User,
                                          sample_image_bytes: bytes,
                                          other_user: User,
                                          cleanup_minio_bucket):
        await self.create_sample_files(async_client, test_user, auth_headers, sample_image_bytes)
        await self.create_sample_files(async_client, other_user, other_auth_headers, sample_image_bytes, files_count=3)
        response = await async_client.get("/api/v1/files", headers=auth_headers)
        print(f"RESPONSE: {response.json()}")
        assert response.status_code == 200
        data = response.json()
        assert data['total_count'] == 5
        assert len(data['data']) == 5
