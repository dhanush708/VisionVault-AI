"""Video data models."""

from datetime import datetime
from enum import Enum


class VideoStatus(str, Enum):
    """Processing status of a video."""
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
