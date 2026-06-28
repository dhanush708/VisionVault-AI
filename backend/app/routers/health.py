"""Health check and root endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def root():
    """Root endpoint confirming the service is running."""
    return {"message": "VisionVault AI Backend Running"}


@router.get("/health")
def health_check():
    """Health check endpoint for monitoring and load balancers."""
    from app.aws.health import check_s3, check_dynamodb, check_bedrock
    from app.aws.client import get_aws_credentials_metadata
    from app.config import get_settings

    settings = get_settings()
    s3_info = check_s3()
    ddb_info = check_dynamodb()
    bedrock_info = check_bedrock()
    creds_meta = get_aws_credentials_metadata()

    overall_status = "healthy"
    if "error" in (s3_info.get("status"), ddb_info.get("status"), bedrock_info.get("status")):
        overall_status = "degraded"

    return {
        "status": overall_status,
        "service": "VisionVault AI",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "aws_credentials_metadata": creds_meta,
        "aws_services": {
            "s3": s3_info,
            "dynamodb": ddb_info,
            "bedrock": bedrock_info,
        },
    }

