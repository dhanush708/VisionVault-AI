"""AWS services health check helpers."""

import boto3
from botocore.exceptions import ClientError, BotoCoreError
from app.aws.client import _make_kwargs, get_s3_client
from app.config import get_settings
from app.logger import get_logger

logger = get_logger("aws.health")


def check_s3() -> dict:
    """Verify S3 service connectivity and bucket access."""
    settings = get_settings()
    try:
        client = get_s3_client()
        # Head bucket checks permissions and existence of our specific bucket
        client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        logger.info(
            f"[AWS Health Check] Service=S3, Region={settings.AWS_REGION}, Bucket={settings.S3_BUCKET_NAME}, "
            f"Request=head_bucket, Success=True"
        )
        return {"status": "connected", "bucket": settings.S3_BUCKET_NAME, "error": None, "healthy": True}
    except Exception as e:
        error_msg = str(e)
        logger.warning(
            f"[AWS Health Check] Service=S3, Region={settings.AWS_REGION}, Bucket={settings.S3_BUCKET_NAME}, "
            f"Request=head_bucket, Success=False, FailureReason={error_msg}, FallbackReason=Falling back to simulated storage"
        )
        return {"status": "simulated", "bucket": settings.S3_BUCKET_NAME, "error": error_msg, "healthy": False}


def check_dynamodb() -> dict:
    """Verify DynamoDB connectivity and table accessibility."""
    settings = get_settings()
    try:
        # Use DynamoDB client (instead of resource) to describe table
        client = boto3.client("dynamodb", **_make_kwargs())
        client.describe_table(TableName=settings.DYNAMODB_TABLE)
        logger.info(
            f"[AWS Health Check] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=describe_table, Success=True"
        )
        return {"status": "connected", "table": settings.DYNAMODB_TABLE, "error": None, "healthy": True}
    except Exception as e:
        error_msg = str(e)
        logger.warning(
            f"[AWS Health Check] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=describe_table, Success=False, FailureReason={error_msg}, FallbackReason=Falling back to local SQLite/JSON storage"
        )
        return {"status": "local_fallback", "table": settings.DYNAMODB_TABLE, "error": error_msg, "healthy": False}


def check_bedrock() -> dict:
    """Verify Bedrock Runtime model connectivity."""
    settings = get_settings()
    try:
        # We try listing models to verify connection credentials.
        bedrock = boto3.client("bedrock", **_make_kwargs())
        bedrock.list_foundation_models()
        logger.info(
            f"[AWS Health Check] Service=Bedrock, Region={settings.AWS_REGION}, Model={settings.BEDROCK_MODEL}, "
            f"Request=list_foundation_models, Success=True"
        )
        return {"status": "connected", "model": settings.BEDROCK_MODEL, "error": None, "healthy": True}
    except Exception as e:
        error_msg = str(e)
        logger.warning(
            f"[AWS Health Check] Service=Bedrock, Region={settings.AWS_REGION}, Model={settings.BEDROCK_MODEL}, "
            f"Request=list_foundation_models, Success=False, FailureReason={error_msg}, FallbackReason=Local template generation"
        )
        return {"status": "local_generation", "model": settings.BEDROCK_MODEL, "error": error_msg, "healthy": False}

