"""Amazon S3 service for video storage."""

import json
from pathlib import Path
from typing import Optional

from app.aws.client import get_s3_client
from app.config import get_settings
from app.logger import get_logger

logger = get_logger("services.s3")


class S3ServiceError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def upload_file_to_s3(local_path: str, s3_key: str) -> str:
    """Upload a local file to S3.

    Returns the S3 URI on success.
    """
    settings = get_settings()
    try:
        client = get_s3_client()
        client.upload_file(local_path, settings.S3_BUCKET_NAME, s3_key)
        uri = f"s3://{settings.S3_BUCKET_NAME}/{s3_key}"
        logger.info(
            f"[AWS Operation] Service=S3, Region={settings.AWS_REGION}, Bucket={settings.S3_BUCKET_NAME}, "
            f"Request=upload_file, Key={s3_key}, Success=True"
        )
        return uri
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(
            f"[AWS Operation] Service=S3, Region={settings.AWS_REGION}, Bucket={settings.S3_BUCKET_NAME}, "
            f"Request=upload_file, Key={s3_key}, Success=False, FailureReason={err_msg}, "
            f"FallbackReason=Falling back to simulated storage location"
        )
        # Avoid breaking the pipeline on credential/connection issues
        return f"s3://{settings.S3_BUCKET_NAME}/{s3_key} (simulated)"


def generate_presigned_url(s3_key: str, expiry: int = 3600) -> str:
    """Generate a presigned URL for downloading an S3 object."""
    settings = get_settings()
    try:
        client = get_s3_client()
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=expiry,
        )
        logger.info(
            f"[AWS Operation] Service=S3, Region={settings.AWS_REGION}, Bucket={settings.S3_BUCKET_NAME}, "
            f"Request=generate_presigned_url, Key={s3_key}, Success=True"
        )
        return url
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(
            f"[AWS Operation] Service=S3, Region={settings.AWS_REGION}, Bucket={settings.S3_BUCKET_NAME}, "
            f"Request=generate_presigned_url, Key={s3_key}, Success=False, FailureReason={err_msg}, "
            f"FallbackReason=Falling back to simulated direct HTTP link"
        )
        return f"https://{settings.S3_BUCKET_NAME}.s3.amazonaws.com/{s3_key} (simulated)"


def upload_video_pair(video_id: str, original_path: str, compressed_path: str) -> dict:
    """Upload ONLY the compressed video to S3.

    Returns dict with S3 URIs and keys for both (original key/URI are set to None).
    """
    compressed_key = f"videos/compressed/{video_id}.mp4"
    compressed_uri = upload_file_to_s3(compressed_path, compressed_key)

    # Success depends only on the compressed sync success
    s3_success = not ("(simulated)" in compressed_uri)

    return {
        "original_s3_key": None,
        "original_s3_uri": None,
        "compressed_s3_key": compressed_key,
        "compressed_s3_uri": compressed_uri,
        "original_key": None,
        "compressed_key": compressed_key,
        "success": s3_success,
    }


def delete_s3_object(s3_key: str) -> bool:
    """Delete an object from Amazon S3."""
    settings = get_settings()
    try:
        client = get_s3_client()
        client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        logger.info(
            f"[AWS Operation] Service=S3, Region={settings.AWS_REGION}, Bucket={settings.S3_BUCKET_NAME}, "
            f"Request=delete_object, Key={s3_key}, Success=True"
        )
        return True
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(
            f"[AWS Operation] Service=S3, Region={settings.AWS_REGION}, Bucket={settings.S3_BUCKET_NAME}, "
            f"Request=delete_object, Key={s3_key}, Success=False, FailureReason={err_msg}"
        )
        return False


