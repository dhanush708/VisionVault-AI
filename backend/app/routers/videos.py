"""Video metadata and detail API endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.logger import get_logger
from app.services.metadata_service import get_stored_metadata

logger = get_logger("routers.videos")
router = APIRouter(prefix="/api/v1/videos", tags=["Videos"])


@router.get("")
def list_videos():
    """Retrieve all video records from the DynamoDB database or local filesystem fallback."""
    from app.services.dynamodb_service import list_video_records
    return list_video_records()


@router.delete("/{video_id}")
def delete_video(video_id: str):
    """Completely delete a video, including all AWS resources (S3 assets, DynamoDB records) and local temp files."""
    from app.services.pipeline_service import delete_video_completely
    success = delete_video_completely(video_id)
    return {"success": success, "message": f"Video {video_id} successfully deleted"}


@router.get("/{video_id}/metadata")
def get_video_metadata(video_id: str):
    """Retrieve complete metadata for a specific video.

    Returns the full metadata JSON extracted by FFprobe.
    """
    metadata = get_stored_metadata(video_id)

    if metadata is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "METADATA_NOT_FOUND",
                    "message": f"Metadata not found for video_id: {video_id}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    return metadata

