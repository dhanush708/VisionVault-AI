"""Video upload service handling file validation and storage."""

import uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile

from app.config import get_settings
from app.logger import get_logger
from app.models.video import VideoStatus

logger = get_logger("services.upload")

ALLOWED_CONTENT_TYPES = {
    "video/mp4",
    "video/x-msvideo",
    "video/quicktime",
    "video/x-matroska",
    "application/octet-stream",
}


class UploadValidationError(Exception):
    """Raised when upload validation fails."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def validate_file_extension(filename: str) -> None:
    """Validate the file has an allowed extension."""
    settings = get_settings()
    extension = Path(filename).suffix.lower()
    if extension not in settings.ALLOWED_EXTENSIONS:
        raise UploadValidationError(
            code="UNSUPPORTED_FORMAT",
            message=f"File format '{extension}' is not supported. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )


def validate_file_size(file_size: int) -> None:
    """Validate the file does not exceed the maximum size."""
    settings = get_settings()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise UploadValidationError(
            code="FILE_TOO_LARGE",
            message=f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed ({settings.MAX_UPLOAD_SIZE_MB} MB).",
        )


def get_upload_directory() -> Path:
    """Get the storage/original directory, creating it if it does not exist."""
    settings = get_settings()
    storage_dir = Path(settings.STORAGE_DIRECTORY)
    original_dir = storage_dir / "original"
    original_dir.mkdir(parents=True, exist_ok=True)
    return original_dir


def ensure_storage_structure() -> None:
    """Create the full storage directory structure."""
    settings = get_settings()
    storage_dir = Path(settings.STORAGE_DIRECTORY)
    for subdir in ["original", "compressed", "enhanced", "thumbnails", "metadata", "reports", "temp"]:
        (storage_dir / subdir).mkdir(parents=True, exist_ok=True)


async def save_uploaded_file(file: UploadFile) -> dict:
    """Validate and save an uploaded video file to local storage.

    Returns a dictionary containing video_id, file_name, file_size_bytes,
    upload_timestamp, local_path, and status.
    """
    filename = file.filename or "unknown_video"

    validate_file_extension(filename)
    ensure_storage_structure()

    video_id = str(uuid.uuid4())
    upload_dir = get_upload_directory()
    extension = Path(filename).suffix.lower()
    dest_filename = f"{video_id}{extension}"
    dest_path = upload_dir / dest_filename

    logger.info(f"Upload started: video_id={video_id}, filename={filename}")

    file_size = 0
    try:
        with open(dest_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1 MB chunks
                if not chunk:
                    break
                file_size += len(chunk)
                buffer.write(chunk)

                settings = get_settings()
                max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
                if file_size > max_bytes:
                    buffer.close()
                    dest_path.unlink(missing_ok=True)
                    raise UploadValidationError(
                        code="FILE_TOO_LARGE",
                        message=f"File size exceeds maximum allowed ({settings.MAX_UPLOAD_SIZE_MB} MB).",
                    )
    except UploadValidationError:
        raise
    except Exception as e:
        dest_path.unlink(missing_ok=True)
        logger.error(f"Upload failed: video_id={video_id}, error={str(e)}")
        raise UploadValidationError(
            code="UPLOAD_FAILED",
            message=f"Failed to save uploaded file: {str(e)}",
        )

    upload_timestamp = datetime.now(timezone.utc).isoformat()

    logger.info(
        f"Upload complete: video_id={video_id}, "
        f"file_size={file_size} bytes, "
        f"path={dest_path}"
    )

    return {
        "video_id": video_id,
        "file_name": filename,
        "file_size_bytes": file_size,
        "upload_timestamp": upload_timestamp,
        "local_path": str(dest_path),
        "status": VideoStatus.UPLOADING.value,
    }
