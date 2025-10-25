import json

import boto3
from botocore.client import Config

from ..core.config import settings


class MinioClient:
    def __init__(self):
        self.endpoint = settings.APP_S3_ENDPOINT
        self.access_key = settings.APP_S3_ACCESS_KEY
        self.secret_key = settings.APP_S3_SECRET_KEY
        self.bucket_uploads = settings.APP_S3_BUCKET_UPLOADS
        self.client = boto3.client(
            "s3",
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version="s3v4"),
            verify=False
        )
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """ Create a bucket if it doesn't exist """
        try:
            self.client.head_bucket(Bucket=self.bucket_uploads)
        except Exception as e:
            self.client.create_bucket(Bucket=self.bucket_uploads)

            # Set bucket policy for public read ( adjust for production )
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": "s3:GetObject",
                        "Resource": f"arn:aws:s3:::{self.bucket_uploads}/*"
                    }
                ]
            }
            self.client.put_bucket_policy(
                Bucket=self.bucket_uploads,
                Policy=json.dumps(policy)
            )

    def upload_file(self, bucket: str, key: str, data: bytes, content_type: str = None):
        """ Upload raw bytes to the given bucket and key """
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        # Use put_object since we have bytes
        self.client.put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            **extra_args
        )


minio_client = MinioClient()
