"""Structured logging configuration for VisionVault AI."""

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.config import get_settings


class StructuredFormatter(logging.Formatter):
    """JSON-style structured log formatter."""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        level = record.levelname
        service = record.name
        message = record.getMessage()

        log_entry = (
            f'{{"timestamp":"{timestamp}",'
            f'"level":"{level}",'
            f'"service":"{service}",'
            f'"message":"{message}"}}'
        )

        if record.exc_info:
            log_entry = log_entry[:-1] + f',"exception":"{self.formatException(record.exc_info)}"}}'

        return log_entry


def setup_logging() -> logging.Logger:
    """Configure application logging with console and file handlers."""
    settings = get_settings()
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    logger = logging.getLogger("visionvault")
    logger.setLevel(log_level)
    logger.handlers.clear()

    formatter = StructuredFormatter()

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    file_handler = logging.FileHandler(log_dir / settings.LOG_FILE)
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


def get_logger(name: str = "visionvault") -> logging.Logger:
    """Get a named logger instance."""
    return logging.getLogger(f"visionvault.{name}")
