"""Tests for the metadata extraction service."""

import json
import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from app.services.metadata_service import (
    extract_metadata,
    get_stored_metadata,
    MetadataExtractionError,
    _parse_fps,
)


SAMPLE_FFPROBE_OUTPUT = json.dumps({
    "format": {
        "filename": "test.mp4",
        "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
        "format_long_name": "QuickTime / MOV",
        "duration": "120.5",
        "size": "52428800",
        "bit_rate": "3481600",
        "tags": {
            "creation_time": "2026-01-15T10:30:00.000000Z"
        }
    },
    "streams": [
        {
            "codec_type": "video",
            "codec_name": "h264",
            "width": 1920,
            "height": 1080,
            "r_frame_rate": "30/1",
            "tags": {}
        },
        {
            "codec_type": "audio",
            "codec_name": "aac",
            "tags": {}
        }
    ]
})


class TestParseFrameRate:
    """Tests for FPS string parsing."""

    def test_simple_integer(self):
        assert _parse_fps("30/1") == 30.0

    def test_fractional(self):
        assert _parse_fps("30000/1001") == 29.97

    def test_zero_denominator(self):
        assert _parse_fps("30/0") == 0.0

    def test_plain_number(self):
        assert _parse_fps("25") == 25.0

    def test_invalid_string(self):
        assert _parse_fps("invalid") == 0.0


class TestExtractMetadata:
    """Tests for the main extract_metadata function."""

    @patch("app.services.metadata_service.subprocess.run")
    def test_valid_mp4(self, mock_run, tmp_path):
        """Test metadata extraction from a valid MP4 file."""
        video_file = tmp_path / "test.mp4"
        video_file.write_bytes(b"\x00" * 1024)

        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=SAMPLE_FFPROBE_OUTPUT,
            stderr=""
        )

        with patch("app.services.metadata_service.get_settings") as mock_settings:
            mock_settings.return_value.FFPROBE_PATH = "ffprobe"
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")

            result = extract_metadata(str(video_file), "test-video-id")

        assert result["video_id"] == "test-video-id"
        assert result["width"] == 1920
        assert result["height"] == 1080
        assert result["resolution"] == "1920x1080"
        assert result["fps"] == 30.0
        assert result["codec"] == "h264"
        assert result["bitrate_kbps"] == 3481
        assert result["duration_seconds"] == 120.5
        assert result["audio_present"] is True
        assert result["video_stream_count"] == 1
        assert result["audio_stream_count"] == 1
        assert result["container_format"] == "QuickTime / MOV"
        assert result["creation_time"] == "2026-01-15T10:30:00.000000Z"
        assert result["status"] == "metadata_extracted"

    def test_missing_file(self):
        """Test that missing file raises MetadataExtractionError."""
        with pytest.raises(MetadataExtractionError) as exc_info:
            extract_metadata("/nonexistent/path/video.mp4", "test-id")
        assert exc_info.value.code == "FILE_NOT_FOUND"

    @patch("app.services.metadata_service.subprocess.run")
    def test_ffprobe_failure(self, mock_run, tmp_path):
        """Test handling when FFprobe returns non-zero exit code."""
        video_file = tmp_path / "corrupt.mp4"
        video_file.write_bytes(b"\x00" * 100)

        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="Invalid data found when processing input"
        )

        with patch("app.services.metadata_service.get_settings") as mock_settings:
            mock_settings.return_value.FFPROBE_PATH = "ffprobe"
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")

            with pytest.raises(MetadataExtractionError) as exc_info:
                extract_metadata(str(video_file), "test-id")
            assert exc_info.value.code == "FFPROBE_FAILED"

    @patch("app.services.metadata_service.subprocess.run")
    def test_ffprobe_not_installed(self, mock_run, tmp_path):
        """Test handling when FFprobe binary is not found."""
        video_file = tmp_path / "test.mp4"
        video_file.write_bytes(b"\x00" * 100)

        mock_run.side_effect = FileNotFoundError("ffprobe not found")

        with patch("app.services.metadata_service.get_settings") as mock_settings:
            mock_settings.return_value.FFPROBE_PATH = "ffprobe"
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")

            with pytest.raises(MetadataExtractionError) as exc_info:
                extract_metadata(str(video_file), "test-id")
            assert exc_info.value.code == "FFPROBE_NOT_FOUND"


class TestGetStoredMetadata:
    """Tests for stored metadata retrieval."""

    def test_existing_metadata(self, tmp_path):
        """Test loading metadata from existing JSON file."""
        metadata_dir = tmp_path / "storage" / "metadata"
        metadata_dir.mkdir(parents=True)

        test_metadata = {"video_id": "abc", "resolution": "1920x1080"}
        (metadata_dir / "abc.json").write_text(json.dumps(test_metadata))

        with patch("app.services.metadata_service.get_settings") as mock_settings:
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")
            result = get_stored_metadata("abc")

        assert result == test_metadata

    def test_missing_metadata(self, tmp_path):
        """Test that missing metadata returns None."""
        with patch("app.services.metadata_service.get_settings") as mock_settings:
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")
            result = get_stored_metadata("nonexistent-id")

        assert result is None
