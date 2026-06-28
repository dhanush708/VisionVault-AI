"""Optimization service — wraps the optimization engine for the API layer."""

from app.ai.optimization_engine.engine import run_analysis, get_stored_analysis, OptimizationEngineError
from app.logger import get_logger

logger = get_logger("services.optimization")


def analyze_video(video_path: str, video_id: str) -> dict:
    """Run optimization analysis on a video file.

    Args:
        video_path: Path to the video file.
        video_id: Unique video identifier.

    Returns:
        Complete analysis result.

    Raises:
        OptimizationEngineError: If analysis fails.
    """
    return run_analysis(video_path, video_id)


def get_analysis(video_id: str) -> dict | None:
    """Retrieve stored analysis for a video. Returns None if not found."""
    return get_stored_analysis(video_id)
