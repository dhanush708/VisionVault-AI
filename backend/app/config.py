# Author: Dhanush Anbu
# Project: VisionVault AI
"""Application configuration loaded from environment variables."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """VisionVault AI application settings."""

    APP_NAME: str = "VisionVault AI"
    APP_VERSION: str = "1.0.0"
    APP_AUTHOR: str = "Dhanush Anbu"
    APP_REPOSITORY: str = "https://github.com/dhanush708"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8002

    # AWS — credentials must be set in .env (never hardcoded)
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_SESSION_TOKEN: str = ""  # For STS temporary credentials

    # S3
    S3_BUCKET_NAME: str = "visionvault-ai-dhanush"

    # DynamoDB
    DYNAMODB_TABLE: str = "visionvault-videos"

    # Bedrock
    BEDROCK_MODEL: str = "anthropic.claude-3-sonnet-20240229-v1:0"

    # Cognito
    COGNITO_POOL_ID: str = ""
    COGNITO_CLIENT_ID: str = ""

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "visionvault.log"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Upload
    MAX_UPLOAD_SIZE_MB: int = 2048
    UPLOAD_DIRECTORY: str = "uploads"
    STORAGE_DIRECTORY: str = "storage"
    ALLOWED_EXTENSIONS: list[str] = [".mp4", ".avi", ".mov", ".mkv"]
    FFPROBE_PATH: str = "ffprobe"
    FFMPEG_PATH: str = "ffmpeg"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # Ignore unrecognised .env keys
    }


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
