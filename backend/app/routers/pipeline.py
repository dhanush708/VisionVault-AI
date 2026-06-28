"""Full processing pipeline API endpoints."""

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import get_settings
from app.logger import get_logger
from app.services.pipeline_service import get_pipeline_state, get_pipeline_result
from app.services.thumbnail_service import get_thumbnail_path
from app.services.enhancement_service import (
    start_enhancement,
    get_enhancement_state,
    get_stored_enhancement,
    EnhancementError,
)

logger = get_logger("routers.pipeline")
router = APIRouter(prefix="/api/v1/pipeline", tags=["Pipeline"])


class PipelineRequest(BaseModel):
    video_id: str
    profile: str = "balanced"


@router.post("/start")
def start_pipeline(body: PipelineRequest):
    """Start the full processing pipeline for a video (if not already running)."""
    import threading
    from app.services.pipeline_service import run_full_pipeline

    settings = get_settings()
    original_dir = Path(settings.STORAGE_DIRECTORY) / "original"
    input_file = _find_video(original_dir, body.video_id)

    if not input_file:
        raise HTTPException(status_code=404, detail={
            "error": {"code": "VIDEO_NOT_FOUND", "message": f"Video not found: {body.video_id}",
                      "timestamp": datetime.now(timezone.utc).isoformat()}
        })

    # Idempotent — don't double-start
    state = get_pipeline_state(body.video_id)
    if state and state.get("status") == "processing":
        return {"message": "Pipeline already in progress", "state": state}

    thread = threading.Thread(
        target=run_full_pipeline,
        args=(body.video_id, str(input_file), body.profile),
        daemon=True,
    )
    thread.start()

    return {"message": "Pipeline started", "video_id": body.video_id, "profile": body.profile}


@router.get("/{video_id}/state")
def get_state(video_id: str):
    """Get the current pipeline state including stages and activity log."""
    state = get_pipeline_state(video_id)
    if state is None:
        raise HTTPException(status_code=404, detail={
            "error": {"code": "NOT_FOUND", "message": f"No pipeline state for: {video_id}",
                      "timestamp": datetime.now(timezone.utc).isoformat()}
        })
    return state


@router.get("/{video_id}/result")
def get_result(video_id: str):
    """Get the final pipeline result with all data."""
    result = get_pipeline_result(video_id)
    if result is None:
        raise HTTPException(status_code=404, detail={
            "error": {"code": "NOT_FOUND", "message": f"No pipeline result for: {video_id}",
                      "timestamp": datetime.now(timezone.utc).isoformat()}
        })
    return result


@router.get("/{video_id}/thumbnail")
def get_thumbnail(video_id: str):
    """Get the generated thumbnail for a video."""
    thumb_path = get_thumbnail_path(video_id)
    if not thumb_path:
        raise HTTPException(status_code=404, detail={
            "error": {"code": "THUMBNAIL_NOT_FOUND", "message": f"No thumbnail for: {video_id}",
                      "timestamp": datetime.now(timezone.utc).isoformat()}
        })
    return FileResponse(thumb_path, media_type="image/jpeg")


# ─── AI Enhancement Endpoints ──────────────────────────────────────────────────

@router.post("/{video_id}/enhance")
def request_enhancement(video_id: str):
    """Start the AI enhancement pipeline for a compressed video.

    Uses GPU-accelerated sharpness restoration and super-resolution enhancement.
    Poll /enhance/status for progress.
    """
    try:
        state = start_enhancement(video_id)
        return {"message": "AI Enhancement started", "video_id": video_id, "state": state}
    except EnhancementError as e:
        raise HTTPException(status_code=404, detail={
            "error": {"code": e.code, "message": e.message,
                      "timestamp": datetime.now(timezone.utc).isoformat()}
        })


@router.get("/{video_id}/enhance/status")
def get_enhance_status(video_id: str):
    """Get the current AI enhancement progress and status."""
    # Check in-memory first, then persisted record
    state = get_enhancement_state(video_id)
    if state is None:
        state = get_stored_enhancement(video_id)
    if state is None:
        raise HTTPException(status_code=404, detail={
            "error": {"code": "NOT_FOUND",
                      "message": f"No enhancement job found for: {video_id}",
                      "timestamp": datetime.now(timezone.utc).isoformat()}
        })
    return state


@router.get("/{video_id}/enhance/report")
def get_enhancement_report(video_id: str):
    """Retrieve the generated Executive AI Enhancement Report."""
    settings = get_settings()
    report_path = Path(settings.STORAGE_DIRECTORY) / "reports" / f"{video_id}_enhancement_report.json"
    if not report_path.exists():
        state = get_enhancement_state(video_id) or get_stored_enhancement(video_id)
        if state and state.get("status") == "completed":
            from app.services.enhancement_service import _generate_executive_report
            try:
                report = _generate_executive_report(video_id)
                return report
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to generate report: {e}")
        raise HTTPException(status_code=404, detail={
            "error": {"code": "REPORT_NOT_FOUND",
                      "message": f"Enhancement report not found for: {video_id}",
                      "timestamp": datetime.now(timezone.utc).isoformat()}
        })
    try:
        with open(report_path, "r", encoding="utf-8") as f:
            import json
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load report: {e}")


# ─── Download Endpoints ────────────────────────────────────────────────────────

@router.get("/{video_id}/download/{file_type}")
def download_video(video_id: str, file_type: str, inline: bool = False):
    """Download a video file directly.

    file_type: 'original' | 'compressed' | 'enhanced'
    """
    settings = get_settings()

    if file_type == "original":
        directory = Path(settings.STORAGE_DIRECTORY) / "original"
        path = _find_video(directory, video_id)
        filename = f"{video_id}_original.mp4"
    elif file_type == "compressed":
        path = Path(settings.STORAGE_DIRECTORY) / "compressed" / f"{video_id}.mp4"
        filename = f"{video_id}_compressed.mp4"
    elif file_type == "enhanced":
        path = Path(settings.STORAGE_DIRECTORY) / "enhanced" / f"{video_id}_enhanced.mp4"
        filename = f"{video_id}_enhanced.mp4"
    else:
        raise HTTPException(status_code=400, detail={
            "error": {"code": "INVALID_TYPE",
                      "message": "file_type must be original, compressed, or enhanced",
                      "timestamp": datetime.now(timezone.utc).isoformat()}
        })

    if not path or not Path(str(path)).exists():
        raise HTTPException(status_code=404, detail={
            "error": {"code": "FILE_NOT_FOUND",
                      "message": f"{file_type} video not found for: {video_id}",
                      "timestamp": datetime.now(timezone.utc).isoformat()}
        })

    if inline:
        return FileResponse(
            str(path),
            media_type="video/mp4",
            headers={"Content-Disposition": "inline"},
        )
    else:
        return FileResponse(
            str(path),
            media_type="video/mp4",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


# ─── AWS Status Endpoint ───────────────────────────────────────────────────────

@router.get("/aws/status")
def get_aws_status():
    """Return AWS service connectivity status."""
    from app.aws.health import check_s3, check_dynamodb, check_bedrock
    settings = get_settings()
    s3_info = check_s3()
    ddb_info = check_dynamodb()
    bedrock_info = check_bedrock()
    has_creds = bool(settings.AWS_ACCESS_KEY_ID)
    return {
        "aws_configured": has_creds,
        "services": {
            "s3": s3_info,
            "dynamodb": ddb_info,
            "bedrock": bedrock_info,
            "cognito": {"status": "connected" if (has_creds and settings.COGNITO_POOL_ID) else "pending", "pool": settings.COGNITO_POOL_ID or "not configured"},
        },
        "region": settings.AWS_REGION,
        "gpu": "RTX 4060 (NVENC enabled)" if _check_nvenc_quick() else "CPU mode",
    }


def _find_video(directory: Path, video_id: str) -> Path | None:
    if not directory.exists():
        return None
    for ext in [".mp4", ".avi", ".mov", ".mkv"]:
        candidate = directory / f"{video_id}{ext}"
        if candidate.exists():
            return candidate
    return None


def _check_nvenc_quick() -> bool:
    """Quick NVENC check using cached result from compression service."""
    try:
        from app.services.compression_service import detect_nvenc_available
        return detect_nvenc_available()
    except Exception:
        return False
