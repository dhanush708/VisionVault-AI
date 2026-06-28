"""Tests for the compression service."""

import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from app.services.compression_service import (
    compress_video,
    get_compression_report,
    get_progress,
    detect_nvenc_available,
    get_encoder,
    CompressionError,
    PROFILES,
    _build_ffmpeg_command,
    _parse_time_from_line,
)


class TestProfiles:
    """Tests for compression profile configuration."""

    def test_all_profiles_exist(self):
        assert "archive" in PROFILES
        assert "balanced" in PROFILES
        assert "evidence" in PROFILES

    def test_archive_highest_crf(self):
        assert PROFILES["archive"]["crf"] > PROFILES["balanced"]["crf"]
        assert PROFILES["balanced"]["crf"] > PROFILES["evidence"]["crf"]

    def test_evidence_slow_preset(self):
        assert PROFILES["evidence"]["preset"] == "slow"


class TestEncoderDetection:
    """Tests for encoder selection."""

    def setup_method(self):
        import app.services.compression_service as cs
        cs._nvenc_available = None

    @patch("app.services.compression_service.subprocess.run")
    def test_nvenc_detected(self, mock_run):
        mock_run.return_value = MagicMock(stdout="hevc_nvenc NVIDIA NVENC")
        assert detect_nvenc_available() is True

    @patch("app.services.compression_service.subprocess.run")
    def test_nvenc_not_available(self, mock_run):
        mock_run.return_value = MagicMock(stdout="libx265 only")
        assert detect_nvenc_available() is False

    @patch("app.services.compression_service.subprocess.run")
    def test_ffmpeg_not_installed(self, mock_run):
        mock_run.side_effect = FileNotFoundError()
        assert detect_nvenc_available() is False

    @patch("app.services.compression_service.detect_nvenc_available")
    def test_get_encoder_with_nvenc(self, mock_nvenc):
        mock_nvenc.return_value = True
        encoder, name = get_encoder()
        assert encoder == "hevc_nvenc"
        assert "NVENC" in name

    @patch("app.services.compression_service.detect_nvenc_available")
    def test_get_encoder_fallback(self, mock_nvenc):
        mock_nvenc.return_value = False
        encoder, name = get_encoder()
        assert encoder == "libx265"
        assert "libx265" in name


class TestFFmpegCommand:
    """Tests for FFmpeg command building."""

    def test_libx265_command(self):
        cmd = _build_ffmpeg_command("/input.mp4", "/output.mp4", "libx265", 25, "medium")
        assert "-c:v" in cmd
        assert "libx265" in cmd
        assert "-crf" in cmd
        assert "25" in cmd
        assert "-preset" in cmd
        assert "medium" in cmd

    def test_nvenc_command(self):
        cmd = _build_ffmpeg_command("/input.mp4", "/output.mp4", "hevc_nvenc", 25, "medium")
        assert "hevc_nvenc" in cmd
        assert "-cq" in cmd
        assert "25" in cmd
        assert "-preset" in cmd
        assert "p4" in cmd


class TestParseTime:
    """Tests for progress time parsing."""

    def test_valid_time(self):
        assert _parse_time_from_line("frame=100 time=00:01:30.50 bitrate=1000") == 90.5

    def test_no_time(self):
        assert _parse_time_from_line("some other output") == 0.0

    def test_empty_string(self):
        assert _parse_time_from_line("") == 0.0


class TestCompressVideo:
    """Tests for the compress_video function."""

    def test_invalid_profile(self, tmp_path):
        video_file = tmp_path / "test.mp4"
        video_file.write_bytes(b"\x00" * 100)
        with pytest.raises(CompressionError) as exc_info:
            compress_video("test-id", str(video_file), "invalid_profile")
        assert exc_info.value.code == "INVALID_PROFILE"

    def test_file_not_found(self):
        with pytest.raises(CompressionError) as exc_info:
            compress_video("test-id", "/nonexistent/video.mp4", "balanced")
        assert exc_info.value.code == "FILE_NOT_FOUND"

    @patch("app.services.compression_service.subprocess.Popen")
    @patch("app.services.compression_service._get_duration")
    @patch("app.services.compression_service._verify_quality")
    @patch("app.services.compression_service.get_encoder")
    def test_successful_compression(self, mock_encoder, mock_quality, mock_duration, mock_popen, tmp_path):
        input_file = tmp_path / "storage" / "original" / "test-id.mp4"
        input_file.parent.mkdir(parents=True)
        input_file.write_bytes(b"\x00" * 10000)

        mock_encoder.return_value = ("libx265", "libx265 (CPU)")
        mock_duration.return_value = 10.0
        mock_quality.return_value = {"ssim": 0.92, "psnr": 38.5}

        # Mock the Popen process
        mock_proc = MagicMock()
        mock_proc.stderr.readline.side_effect = [""]
        mock_proc.returncode = 0
        mock_proc.wait.return_value = None
        mock_popen.return_value = mock_proc

        # Create a fake output file
        compressed_dir = tmp_path / "storage" / "compressed"
        compressed_dir.mkdir(parents=True)
        output_file = compressed_dir / "test-id.mp4"
        output_file.write_bytes(b"\x00" * 3000)

        with patch("app.services.compression_service.get_settings") as mock_settings:
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")
            mock_settings.return_value.FFMPEG_PATH = "ffmpeg"
            mock_settings.return_value.FFPROBE_PATH = "ffprobe"

            result = compress_video("test-id", str(input_file), "balanced")

        assert result["video_id"] == "test-id"
        assert result["status"] == "completed"
        assert result["profile"] == "balanced"
        assert result["original_size_bytes"] == 10000
        assert result["compressed_size_bytes"] == 3000
        assert result["space_saved_percent"] == 70.0
        assert result["quality"]["ssim"] == 0.92
        assert result["quality"]["psnr"] == 38.5


class TestCompressionReport:
    """Tests for report storage and retrieval."""

    def test_get_report_not_found(self, tmp_path):
        with patch("app.services.compression_service.get_settings") as mock_settings:
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")
            assert get_compression_report("nonexistent") is None

    def test_get_report_exists(self, tmp_path):
        reports_dir = tmp_path / "storage" / "reports"
        reports_dir.mkdir(parents=True)
        report = {"video_id": "abc", "status": "completed"}
        (reports_dir / "abc_compression.json").write_text(json.dumps(report))

        with patch("app.services.compression_service.get_settings") as mock_settings:
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")
            result = get_compression_report("abc")
        assert result == report


class TestProgress:
    """Tests for progress tracking."""

    def test_no_progress_returns_none(self):
        result = get_progress("nonexistent-video")
        assert result is None
