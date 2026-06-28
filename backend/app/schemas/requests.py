"""API request schemas."""

from pydantic import BaseModel, Field
from typing import Optional


class UploadMetadata(BaseModel):
    """Optional metadata provided with upload."""
    camera_id: Optional[str] = Field(None, max_length=100, pattern=r"^[a-zA-Z0-9\-_]*$")
    description: Optional[str] = Field(None, max_length=500)
