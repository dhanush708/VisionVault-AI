"""Video upload API endpoints."""

from datetime import datetime, timezone
import threading

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from typing import Optional

from app.logger import get_logger
from app.schemas.responses import UploadResponse, ErrorResponse
from app.services.upload_service import save_uploaded_file, UploadValidationError
from app.services.pipeline_service import run_full_pipeline

logger = get_logger("routers.upload")
router = APIRouter(prefix="/api/v1/videos", tags=["Upload"])


@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        413: {"model": ErrorResponse, "description": "File too large"},
        415: {"model": ErrorResponse, "description": "Unsupported format"},
    },
)
async def upload_video(
    file: UploadFile = File(..., description="Video file (MP4, AVI, MOV, MKV, max 2 GB)"),
    camera_id: Optional[str] = Form(None, description="Camera identifier"),
    description: Optional[str] = Form(None, description="Video description"),
    profile: Optional[str] = Form("balanced", description="Compression profile"),
):
    """Upload a CCTV video file for processing.

    Saves the file immediately and returns a video_id.
    The full pipeline (metadata → analysis → compression → S3 → DynamoDB → Bedrock)
    runs asynchronously in the background. Poll /api/v1/pipeline/{video_id}/state
    for progress.
    """
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "MISSING_FILE",
                    "message": "No file was provided in the request.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    try:
        result = await save_uploaded_file(file)
    except UploadValidationError as e:
        status_code = 415 if e.code == "UNSUPPORTED_FORMAT" else 413 if e.code == "FILE_TOO_LARGE" else 400
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": {
                    "code": e.code,
                    "message": e.message,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    video_id = result["video_id"]
    input_path = result["local_path"]
    selected_profile = profile if profile in ("archive", "balanced", "evidence") else "balanced"

    logger.info(f"Upload complete — starting pipeline in background: video_id={video_id}")

    # Start full pipeline in background thread immediately after upload
    thread = threading.Thread(
        target=run_full_pipeline,
        args=(video_id, input_path, selected_profile),
        daemon=True,
    )
    thread.start()

    result["status"] = "processing"
    return UploadResponse(**result)
