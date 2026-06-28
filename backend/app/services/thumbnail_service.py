"""Thumbnail generation service using FFmpeg."""

import subprocess
from pathlib import Path

from app.config import get_settings
from app.logger import get_logger

logger = get_logger("services.thumbnail")


def generate_thumbnail(video_path: str, video_id: str, seek_percent: float = 0.1) -> str | None:
    """Generate a JPEG thumbnail from a video frame.

    Extracts a frame at seek_percent of the video duration, resizes to 640x360.

    Args:
        video_path: Path to the video file.
        video_id: Unique video identifier.
        seek_percent: Percentage of duration to seek to (0.0-1.0).

    Returns:
        Path to the generated thumbnail, or None if generation failed.
    """
    settings = get_settings()
    input_file = Path(video_path)
    if not input_file.exists():
        logger.warning(f"Cannot generate thumbnail — file not found: {video_path}")
        return None

    thumbnails_dir = Path(settings.STORAGE_DIRECTORY) / "thumbnails"
    thumbnails_dir.mkdir(parents=True, exist_ok=True)
    output_path = thumbnails_dir / f"{video_id}.jpg"

    # Get duration
    duration = _get_duration(video_path)
    seek_time = duration * seek_percent if duration > 0 else 1.0

    command = [
        settings.FFMPEG_PATH,
        "-y",
        "-ss", str(seek_time),
        "-i", str(input_file),
        "-frames:v", "1",
        "-vf", "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2",
        "-q:v", "5",
        str(output_path),
    ]

    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and output_path.exists():
            logger.info(f"Thumbnail generated: {output_path}")
            return str(output_path)
        else:
            logger.warning(f"Thumbnail generation failed: {result.stderr[:200]}")
            return None
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        logger.warning(f"Thumbnail generation error: {str(e)}")
        return None


def get_thumbnail_path(video_id: str) -> str | None:
    """Get the thumbnail path if it exists."""
    settings = get_settings()
    path = Path(settings.STORAGE_DIRECTORY) / "thumbnails" / f"{video_id}.jpg"
    return str(path) if path.exists() else None


def _get_duration(file_path: str) -> float:
    """Get video duration using FFprobe."""
    settings = get_settings()
    try:
        result = subprocess.run(
            [settings.FFPROBE_PATH, "-v", "quiet", "-show_entries",
             "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            capture_output=True, text=True, timeout=15,
        )
        return float(result.stdout.strip()) if result.stdout.strip() else 0.0
    except (subprocess.TimeoutExpired, ValueError, FileNotFoundError):
        return 0.0
