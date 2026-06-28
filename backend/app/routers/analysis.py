"""Video analysis API endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.logger import get_logger
from app.services.optimization_service import get_analysis

logger = get_logger("routers.analysis")
router = APIRouter(prefix="/api/v1/videos", tags=["Analysis"])


@router.get("/{video_id}/analysis")
def get_video_analysis(video_id: str):
    """Retrieve the complete VisionVault optimization analysis for a video.

    Returns all analyzer scores, compression potential, confidence,
    recommended profile, and human-readable reasoning.
    """
    analysis = get_analysis(video_id)

    if analysis is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "ANALYSIS_NOT_FOUND",
                    "message": f"Analysis not found for video_id: {video_id}. The video may not have been analyzed yet.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    return analysis
