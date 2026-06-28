"""API response schemas."""

from pydantic import BaseModel
from typing import Optional


class UploadResponse(BaseModel):
    """Response returned after successful video upload."""
    video_id: str
    file_name: str
    file_size_bytes: int
    upload_timestamp: str
    local_path: str
    status: str


class UploadStatusResponse(BaseModel):
    """Response for upload status check."""
    video_id: str
    status: str
    file_name: str
    file_size_bytes: int
    upload_timestamp: str


class ErrorResponse(BaseModel):
    """Standardized error response."""
    error: "ErrorDetail"


class ErrorDetail(BaseModel):
    """Error detail fields."""
    code: str
    message: str
    details: Optional[str] = None
    timestamp: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    timestamp: str
