"""Video compression API endpoints."""

import threading
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.logger import get_logger
from app.services.compression_service import (
    compress_video,
    get_progress,
    get_compression_report,
    CompressionError,
    PROFILES,
)

logger = get_logger("routers.compression")
router = APIRouter(prefix="/api/v1/videos", tags=["Compression"])


class CompressRequest(BaseModel):
    profile: str = "balanced"


@router.post("/{video_id}/compress")
def start_compression(video_id: str, body: CompressRequest):
    """Start video compression with the specified profile.

    Compression runs in a background thread. Poll /progress for status.
    """
    if body.profile not in PROFILES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PROFILE",
                    "message": f"Invalid profile. Valid options: {list(PROFILES.keys())}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    settings = get_settings()
    original_dir = Path(settings.STORAGE_DIRECTORY) / "original"
    input_file = _find_video_file(original_dir, video_id)

    if not input_file:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "VIDEO_NOT_FOUND",
                    "message": f"Original video not found for video_id: {video_id}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    # Check if already compressing
    progress = get_progress(video_id)
    if progress and progress.get("status") == "compressing":
        return {"message": "Compression already in progress", "progress": progress}

    # Start compression in background thread
    thread = threading.Thread(
        target=_run_compression_background,
        args=(video_id, str(input_file), body.profile),
        daemon=True,
    )
    thread.start()

    return {
        "message": "Compression started",
        "video_id": video_id,
        "profile": body.profile,
        "profile_name": PROFILES[body.profile]["name"],
    }


@router.get("/{video_id}/compress/progress")
def get_compression_progress(video_id: str):
    """Poll compression progress for a video."""
    progress = get_progress(video_id)
    if progress is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NO_COMPRESSION",
                    "message": f"No compression job found for video_id: {video_id}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
    return progress


@router.get("/{video_id}/compress/report")
def get_compression_report_endpoint(video_id: str):
    """Retrieve the compression report for a completed compression job."""
    report = get_compression_report(video_id)
    if report is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "REPORT_NOT_FOUND",
                    "message": f"Compression report not found for video_id: {video_id}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
    return report


def _find_video_file(directory: Path, video_id: str) -> Path | None:
    """Find the video file in the directory matching the video_id."""
    if not directory.exists():
        return None
    for ext in [".mp4", ".avi", ".mov", ".mkv"]:
        candidate = directory / f"{video_id}{ext}"
        if candidate.exists():
            return candidate
    return None


def _run_compression_background(video_id: str, input_path: str, profile: str):
    """Run compression in background thread with error handling."""
    try:
        compress_video(video_id, input_path, profile)
    except CompressionError as e:
        logger.error(f"Background compression failed: video_id={video_id}, error={e.message}")
    except Exception as e:
        logger.error(f"Unexpected compression error: video_id={video_id}, error={str(e)}")
