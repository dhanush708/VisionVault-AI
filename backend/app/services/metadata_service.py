"""Video metadata extraction service using FFprobe subprocess."""

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.logger import get_logger

logger = get_logger("services.metadata")


class MetadataExtractionError(Exception):
    """Raised when FFprobe metadata extraction fails."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def extract_metadata(file_path: str, video_id: str) -> dict:
    """Extract video metadata using FFprobe subprocess.

    Args:
        file_path: Path to the video file.
        video_id: Unique video identifier.

    Returns:
        Dictionary containing all extracted metadata fields.

    Raises:
        MetadataExtractionError: If FFprobe fails or file is not a valid video.
    """
    settings = get_settings()
    path = Path(file_path)

    if not path.exists():
        raise MetadataExtractionError(
            code="FILE_NOT_FOUND",
            message=f"Video file not found: {file_path}",
        )

    logger.info(f"Extracting metadata: video_id={video_id}, path={file_path}")

    command = [
        settings.FFPROBE_PATH,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except FileNotFoundError:
        raise MetadataExtractionError(
            code="FFPROBE_NOT_FOUND",
            message="FFprobe is not installed or not found in PATH.",
        )
    except subprocess.TimeoutExpired:
        raise MetadataExtractionError(
            code="FFPROBE_TIMEOUT",
            message="FFprobe timed out while analyzing the video file.",
        )

    if result.returncode != 0:
        error_output = result.stderr.strip() if result.stderr else "Unknown error"
        logger.error(f"FFprobe failed: video_id={video_id}, error={error_output}")
        raise MetadataExtractionError(
            code="FFPROBE_FAILED",
            message=f"FFprobe could not analyze the file: {error_output}",
        )

    try:
        probe_data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise MetadataExtractionError(
            code="FFPROBE_PARSE_ERROR",
            message="FFprobe returned invalid JSON output.",
        )

    metadata = _parse_probe_data(probe_data, video_id, path)

    _save_metadata_json(metadata, video_id)

    logger.info(
        f"Metadata extracted: video_id={video_id}, "
        f"resolution={metadata['width']}x{metadata['height']}, "
        f"fps={metadata['fps']}, duration={metadata['duration_seconds']}s"
    )

    return metadata


def _parse_probe_data(probe_data: dict, video_id: str, file_path: Path) -> dict:
    """Parse FFprobe JSON output into structured metadata dictionary."""
    format_info = probe_data.get("format", {})
    streams = probe_data.get("streams", [])

    video_streams = [s for s in streams if s.get("codec_type") == "video"]
    audio_streams = [s for s in streams if s.get("codec_type") == "audio"]

    video_stream = video_streams[0] if video_streams else {}

    width = int(video_stream.get("width", 0))
    height = int(video_stream.get("height", 0))
    resolution = f"{width}x{height}" if width and height else "unknown"

    fps = _parse_fps(video_stream.get("r_frame_rate", "0/1"))
    codec = video_stream.get("codec_name", "unknown")

    duration_str = format_info.get("duration", "0")
    duration_seconds = round(float(duration_str), 2) if duration_str else 0.0

    bitrate_str = format_info.get("bit_rate", "0")
    bitrate_kbps = int(int(bitrate_str) / 1000) if bitrate_str and bitrate_str.isdigit() else 0

    file_size_bytes = int(format_info.get("size", 0))
    if file_size_bytes == 0:
        file_size_bytes = file_path.stat().st_size

    container_format = format_info.get("format_long_name", format_info.get("format_name", "unknown"))

    creation_time = _get_creation_time(format_info, video_stream)

    return {
        "video_id": video_id,
        "file_name": file_path.name,
        "width": width,
        "height": height,
        "resolution": resolution,
        "fps": fps,
        "codec": codec,
        "bitrate_kbps": bitrate_kbps,
        "duration_seconds": duration_seconds,
        "file_size_bytes": file_size_bytes,
        "container_format": container_format,
        "audio_present": len(audio_streams) > 0,
        "video_stream_count": len(video_streams),
        "audio_stream_count": len(audio_streams),
        "creation_time": creation_time,
        "extraction_timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "metadata_extracted",
    }


def _parse_fps(fps_string: str) -> float:
    """Parse frame rate from FFprobe rational format (e.g., '30/1' or '30000/1001')."""
    try:
        if "/" in fps_string:
            num, den = fps_string.split("/")
            denominator = int(den)
            if denominator == 0:
                return 0.0
            return round(int(num) / denominator, 2)
        return round(float(fps_string), 2)
    except (ValueError, ZeroDivisionError):
        return 0.0


def _get_creation_time(format_info: dict, video_stream: dict) -> Optional[str]:
    """Extract creation time from format or stream tags."""
    tags = format_info.get("tags", {})
    creation = tags.get("creation_time", None)
    if not creation:
        stream_tags = video_stream.get("tags", {})
        creation = stream_tags.get("creation_time", None)
    return creation


def _save_metadata_json(metadata: dict, video_id: str) -> Path:
    """Save metadata as formatted JSON to storage/metadata/ directory."""
    settings = get_settings()
    metadata_dir = Path(settings.STORAGE_DIRECTORY) / "metadata"
    metadata_dir.mkdir(parents=True, exist_ok=True)

    output_path = metadata_dir / f"{video_id}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    logger.info(f"Metadata saved: {output_path}")
    return output_path


def get_stored_metadata(video_id: str) -> Optional[dict]:
    """Load metadata from stored JSON file.

    Returns None if metadata file does not exist.
    """
    settings = get_settings()
    metadata_path = Path(settings.STORAGE_DIRECTORY) / "metadata" / f"{video_id}.json"

    if not metadata_path.exists():
        return None

    with open(metadata_path, "r", encoding="utf-8") as f:
        return json.load(f)
