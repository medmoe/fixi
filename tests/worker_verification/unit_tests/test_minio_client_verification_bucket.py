"""Tests MinioClient's private-bucket path against the real test-minio
server -- the CNI verification bucket must behave differently from
bucket_uploads (no public-read policy), and a presigned URL must be the
only way to read an object back. Mirrors how tests/user/integration_tests/
test_file.py exercises the public bucket_uploads path against real minio."""

import uuid

import httpx
import pytest

from src.app.core.config import settings
from src.app.services.minio_client import minio_client


@pytest.fixture
def verification_bucket() -> str:
    return settings.APP_S3_BUCKET_VERIFICATION


class TestEnsurePrivateBucketExists:
    def test_is_idempotent(self, verification_bucket):
        minio_client.ensure_private_bucket_exists(verification_bucket)
        minio_client.ensure_private_bucket_exists(verification_bucket)  # should not raise


class TestPresignedDocumentAccess:
    def test_presigned_url_returns_the_uploaded_bytes(self, verification_bucket):
        key = f"cni/{uuid.uuid4().hex}.pdf"
        content = b"%PDF-1.4 fake cni content"

        minio_client.ensure_private_bucket_exists(verification_bucket)
        minio_client.upload_file(bucket=verification_bucket, key=key, data=content, content_type="application/pdf")

        url = minio_client.generate_presigned_get_url(verification_bucket, key)
        response = httpx.get(url)

        assert response.status_code == 200
        assert response.content == content

    def test_unsigned_direct_url_is_denied(self, verification_bucket):
        """The exact behavior Issue 5's acceptance criteria requires: no
        public/unauthenticated access, unlike bucket_uploads."""
        key = f"cni/{uuid.uuid4().hex}.pdf"
        content = b"%PDF-1.4 fake cni content"

        minio_client.ensure_private_bucket_exists(verification_bucket)
        minio_client.upload_file(bucket=verification_bucket, key=key, data=content, content_type="application/pdf")

        direct_url = f"{settings.APP_S3_ENDPOINT.rstrip('/')}/{verification_bucket}/{key}"
        response = httpx.get(direct_url)

        assert response.status_code in (403, 404)
