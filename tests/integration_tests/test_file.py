import pytest
from httpx import AsyncClient

from src.app.models.user import User


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
        response = await async_client.post(f"/api/v1/files", json=self.file_data, headers=auth_headers)
        print(response.json())
        assert response.status_code == 201

        data = response.json()
        assert data["original_file_name"] == self.file_data["original_file_name"]
        assert data["mime_type"] == self.file_data["mime_type"]
        assert data["file_size"] == self.file_data["file_size"]
        assert data["belongs_to_user_id"] == test_user.id
        assert data["uploaded_at"] is not None
        assert data["id"] is not None

    async def test_create_file_with_invalid_data(self, async_client: AsyncClient, auth_headers: dict, test_user: User):
        """ Test creating a file with invalid data """
        file_data_copy = self.file_data.copy()
        del file_data_copy["file_size"]
        response = await async_client.post(f"/api/v1/files", json=file_data_copy, headers=auth_headers)
        assert response.status_code == 422

    async def test_create_file_with_unauthorized_user(self, async_client: AsyncClient, test_user: User):
        """ Test creating a file with an unauthorized user """
        response = await async_client.post(f"/api/v1/files", json=self.file_data)
        assert response.status_code == 401


class TestUploadFileContentEndpoint:
    """ Test file content upload endpoint """
    file_metadata = {"original_file_name": "test.png", "mime_type": "image/png", "file_size": 1000}

    async def create_file_metadata(self, async_client: AsyncClient, auth_headers: dict, test_user: User):
        response = await async_client.post(f"/api/v1/files", json=self.file_metadata, headers=auth_headers)
        assert response.status_code == 201
        return response.json()

    async def test_upload_file_success(self, async_client: AsyncClient, auth_headers: dict, test_user: User, sample_image_bytes: bytes):
        """ Should upload a file successfully """
        file = {"upload_file": ("test.png", sample_image_bytes, "image/png")}
        created_file_data = await self.create_file_metadata(async_client, auth_headers, test_user)
        response = await async_client.post(f"/api/v1/files/{created_file_data['id']}", files=file, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert 'file_url' in data and data['file_url'] is not None

    async def test_upload_file_with_invalid_extension(self, async_client: AsyncClient, auth_headers: dict, sample_image_bytes, test_user: User):
        file = {"upload_file": ("test.js", sample_image_bytes, "image/png")}
        created_file_metadata = await self.create_file_metadata(async_client, auth_headers, test_user)
        response = await async_client.post(f"/api/v1/files/{created_file_metadata['id']}", files=file, headers=auth_headers)
        assert response.status_code == 400

    async def test_upload_file_with_invalid_mime_type(self, async_client: AsyncClient, auth_headers: dict, test_user: User, sample_invalid_image_bytes: bytes):
        file = {"upload_file": ("test.png", sample_invalid_image_bytes, "invalid/mime")}
        created_file_metadata = await self.create_file_metadata(async_client, auth_headers, test_user)
        response = await async_client.post(f"/api/v1/files/{created_file_metadata['id']}", files=file, headers=auth_headers)
        assert response.status_code == 400

    async def test_upload_file_with_invalid_image(self, async_client: AsyncClient, auth_headers: dict, test_user: User, sample_invalid_image_bytes):
        file = {"upload_file": ("test.png", sample_invalid_image_bytes, "image/png")}
        created_file_metadata = await self.create_file_metadata(async_client, auth_headers, test_user)
        response = await async_client.post(f"/api/v1/files/{created_file_metadata['id']}", files=file, headers=auth_headers)
        assert response.status_code == 400

    async def test_upload_file_when_storage_fail(self, async_client: AsyncClient, auth_headers: dict, test_user: User, sample_image_bytes, monkeypatch):
        file = {"upload_file": ("test.png", sample_image_bytes, "image/png")}
        created_file_metadata = await self.create_file_metadata(async_client, auth_headers, test_user)

        # monkey-patch the minio_client.upload_file to raise an exception
        monkeypatch.setattr("src.app.api.v1.files.minio_client.upload_file", lambda *args, **kwargs: (_ for _ in ()).throw(Exception("upload file failed")))
        response = await async_client.post(f"/api/v1/files/{created_file_metadata['id']}", files=file, headers=auth_headers)
        assert response.status_code == 500

    async def test_upload_file_with_unauthorized_user(self, async_client: AsyncClient, sample_image_bytes: bytes, auth_headers: dict, test_user: User):
        file = {"upload_file": ("test.png", sample_image_bytes, "image/png")}
        created_file_metadata = await self.create_file_metadata(async_client, auth_headers, test_user)

        response = await async_client.post(f"/api/v1/files/{created_file_metadata['id']}", files=file)
        assert response.status_code == 401


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
            response = await async_client.post(f"/api/v1/files", json=file_metadata, headers=auth_headers)
            assert response.status_code == 201
            data = response.json()
            file = {"upload_file": (f"test_{i}.png", sample_image_bytes, "image/png")}
            response = await async_client.post(f"/api/v1/files/{data['id']}", files=file, headers=auth_headers)
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
        assert response.status_code == 200
        data = response.json()
        assert data['total_count'] == 5
        assert len(data['data']) == 5

    async def test_getting_files_with_unauthorized_user(self, async_client: AsyncClient, auth_headers: dict):
        response = await async_client.get("/api/v1/files")
        assert response.status_code == 401


@pytest.mark.integration
class TestUpdateFileContentEndpoint:
    """ Test updating/replacing file content via PATCH """

    file_metadata = {
        "original_file_name": "test.png",
        "mime_type": "image/png",
        "file_size": 1000
    }

    async def create_and_upload_file(self, async_client: AsyncClient, auth_headers: dict, sample_image_bytes: bytes):
        """
        Helper:
        1. Create file metadata (POST /api/v1/files)
        2. Upload first version (POST /api/v1/files/{id})
        returns a created file JSON
        """
        # create metadata
        resp_meta = await async_client.post("/api/v1/files", json=self.file_metadata, headers=auth_headers)
        assert resp_meta.status_code == 201
        file_record = resp_meta.json()

        # upload initial content
        init_file = {"upload_file": ("test.png", sample_image_bytes, "image/png")}
        resp_upload = await async_client.post(f"/api/v1/files/{file_record['id']}", files=init_file, headers=auth_headers)
        assert resp_upload.status_code == 200

        return file_record

    async def test_update_file_success(self,
                                       async_client: AsyncClient,
                                       auth_headers: dict,
                                       test_user: User,
                                       sample_image_bytes: bytes,
                                       cleanup_minio_bucket):
        """
        Should allow an owner to replace file content and update metadata.
        """
        file_record = await self.create_and_upload_file(async_client, auth_headers, sample_image_bytes)

        # new replacement image
        patch_file = {"upload_file": ("updated.png", sample_image_bytes, "image/png")}
        response = await async_client.patch(f"/api/v1/files/{file_record['id']}", files=patch_file, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data['file_url'] == file_record['file_url']

    async def test_update_file_invalid_mime(self,
                                            async_client: AsyncClient,
                                            auth_headers: dict,
                                            test_user: User,
                                            sample_invalid_image_bytes: bytes,
                                            sample_image_bytes: bytes,
                                            cleanup_minio_bucket):
        """
        Should fail if new file bytes/mime are invalid.
        Expect HTTP 400 from validate_mime_type.
        """
        # create + upload an original valid file
        file_record = await self.create_and_upload_file(async_client, auth_headers, sample_image_bytes)

        # try to replace with invalid data (e.g. spoofed content)
        patch_file = {"upload_file": ("bad.png", sample_invalid_image_bytes, "invalid/mime")}
        response = await async_client.patch(f"/api/v1/files/{file_record['id']}", files=patch_file, headers=auth_headers)

        assert response.status_code == 400

    async def test_update_file_unauthorized_user(self,
                                                 async_client: AsyncClient,
                                                 auth_headers: dict,
                                                 test_user: User,
                                                 sample_image_bytes: bytes,
                                                 cleanup_minio_bucket):
        """
        No auth headers -> 401 before even hitting logic.
        """
        file_record = await self.create_and_upload_file(async_client, auth_headers, sample_image_bytes)

        patch_file = {"upload_file": ("updated.png", sample_image_bytes, "image/png")}
        response = await async_client.patch(f"/api/v1/files/{file_record['id']}", files=patch_file)

        assert response.status_code == 401

    async def test_update_file_forbidden_other_user(self,
                                                    async_client: AsyncClient,
                                                    auth_headers: dict,
                                                    other_auth_headers: dict,
                                                    test_user: User,
                                                    other_user: User,
                                                    sample_image_bytes: bytes,
                                                    cleanup_minio_bucket):
        """
        Another logged-in user tries to update file they don't own -> 403.
        """
        file_record = await self.create_and_upload_file(async_client, auth_headers, sample_image_bytes)

        patch_file = {"upload_file": ("updated.png", sample_image_bytes, "image/png")}
        response = await async_client.patch(f"/api/v1/files/{file_record['id']}", files=patch_file, headers=other_auth_headers)

        assert response.status_code == 403

    async def test_update_file_when_storage_fail(self,
                                                 async_client: AsyncClient,
                                                 auth_headers: dict,
                                                 test_user: User,
                                                 sample_image_bytes: bytes,
                                                 monkeypatch,
                                                 cleanup_minio_bucket):
        """
        Overwrite fails in object storage -> 500.
        We'll monkeypatch minio_client.upload_file to throw.
        """
        # create a valid file first
        file_record = await self.create_and_upload_file(async_client, auth_headers, sample_image_bytes)

        # monkeypatch upload in PATCH flow
        monkeypatch.setattr(
            "src.app.api.v1.files.minio_client.upload_file",
            lambda *args, **kwargs: (_ for _ in ()).throw(Exception("overwrite failed"))
        )

        patch_file = {"upload_file": ("updated.png", sample_image_bytes, "image/png")}
        response = await async_client.patch(f"/api/v1/files/{file_record['id']}", files=patch_file, headers=auth_headers)

        assert response.status_code == 500


@pytest.mark.integration
class TestDeleteFileEndpoint:
    """ Test deleting a file via DELETE """

    file_metadata = {
        "original_file_name": "test.png",
        "mime_type": "image/png",
        "file_size": 1000
    }

    async def create_and_upload_file(self, async_client: AsyncClient, auth_headers: dict, sample_image_bytes: bytes):
        # create metadata
        resp_meta = await async_client.post("/api/v1/files", json=self.file_metadata, headers=auth_headers)
        assert resp_meta.status_code == 201
        file_record = resp_meta.json()

        # upload content
        init_file = {"upload_file": ("original.png", sample_image_bytes, "image/png")}
        resp_upload = await async_client.post(f"/api/v1/files/{file_record['id']}", files=init_file, headers=auth_headers)
        assert resp_upload.status_code == 200

        return file_record

    async def test_delete_file_success(self,
                                       async_client: AsyncClient,
                                       auth_headers: dict,
                                       test_user: User,
                                       sample_image_bytes: bytes,
                                       cleanup_minio_bucket):
        """
        Owner should be able to delete their file and get 204.
        Then it should disappear from GET /api/v1/files.
        """
        file_record = await self.create_and_upload_file(async_client, auth_headers, sample_image_bytes)

        # delete
        response = await async_client.delete(f"/api/v1/files/{file_record['id']}", headers=auth_headers)
        assert response.status_code == 204

        # confirm it's gone from listing
        list_resp = await async_client.get("/api/v1/files", headers=auth_headers)
        assert list_resp.status_code == 200
        data = list_resp.json()
        # ensure none of the returned file ids match a deleted file id
        assert all(item["id"] != file_record["id"] for item in data["data"])

    async def test_delete_file_unauthorized_user(self,
                                                 async_client: AsyncClient,
                                                 auth_headers: dict,
                                                 test_user: User,
                                                 sample_image_bytes: bytes,
                                                 cleanup_minio_bucket):
        """
        No Authorization header -> 401.
        """
        file_record = await self.create_and_upload_file(async_client, auth_headers, sample_image_bytes)

        response = await async_client.delete(f"/api/v1/files/{file_record['id']}")
        assert response.status_code == 401

    async def test_delete_file_forbidden_other_user(self,
                                                    async_client: AsyncClient,
                                                    auth_headers: dict,
                                                    other_auth_headers: dict,
                                                    test_user: User,
                                                    other_user: User,
                                                    sample_image_bytes: bytes,
                                                    cleanup_minio_bucket):
        """
        Another logged-in user tries to delete a file they don't own -> 403.
        """
        file_record = await self.create_and_upload_file(async_client, auth_headers, sample_image_bytes)

        response = await async_client.delete(f"/api/v1/files/{file_record['id']}", headers=other_auth_headers)
        assert response.status_code == 403

    async def test_delete_file_when_storage_fail(self,
                                                 async_client: AsyncClient,
                                                 auth_headers: dict,
                                                 test_user: User,
                                                 sample_image_bytes: bytes,
                                                 monkeypatch,
                                                 cleanup_minio_bucket):
        """
        If deleting from MinIO raises, DELETE should 500.
        We'll monkeypatch minio_client.delete_file to throw.
        """
        file_record = await self.create_and_upload_file(async_client, auth_headers, sample_image_bytes)

        # monkeypatch to simulate storage delete failure
        monkeypatch.setattr(
            "src.app.api.v1.files.minio_client.delete_file",
            lambda *args, **kwargs: (_ for _ in ()).throw(Exception("delete failed"))
        )

        response = await async_client.delete(f"/api/v1/files/{file_record['id']}", headers=auth_headers)

        assert response.status_code == 500
