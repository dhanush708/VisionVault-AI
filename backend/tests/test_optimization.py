"""Tests for the VisionVault Optimization Engine."""

import json
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest

from app.ai.optimization_engine.motion_analyzer import analyze_motion
from app.ai.optimization_engine.brightness_analyzer import analyze_brightness
from app.ai.optimization_engine.noise_analyzer import analyze_noise
from app.ai.optimization_engine.engine import run_analysis, get_stored_analysis, OptimizationEngineError


def _make_static_frames(count: int = 5, size: tuple = (100, 100)) -> list:
    """Create identical frames (zero motion)."""
    frame = np.full((*size, 3), 128, dtype=np.uint8)
    return [frame.copy() for _ in range(count)]


def _make_moving_frames(count: int = 5, size: tuple = (100, 100)) -> list:
    """Create frames with progressive pixel shifts (high motion)."""
    frames = []
    for i in range(count):
        frame = np.full((*size, 3), (i * 50) % 256, dtype=np.uint8)
        frames.append(frame)
    return frames


def _make_dark_frames(count: int = 5, size: tuple = (100, 100)) -> list:
    """Create very dark frames."""
    frame = np.full((*size, 3), 20, dtype=np.uint8)
    return [frame.copy() for _ in range(count)]


def _make_bright_frames(count: int = 5, size: tuple = (100, 100)) -> list:
    """Create very bright frames."""
    frame = np.full((*size, 3), 230, dtype=np.uint8)
    return [frame.copy() for _ in range(count)]


def _make_noisy_frames(count: int = 5, size: tuple = (100, 100)) -> list:
    """Create noisy frames with random pixel values."""
    rng = np.random.default_rng(42)
    return [rng.integers(0, 256, (*size, 3), dtype=np.uint8) for _ in range(count)]


class TestMotionAnalyzer:
    """Tests for the motion analyzer."""

    def test_static_frames_low_motion(self):
        frames = _make_static_frames(10)
        score = analyze_motion(frames)
        assert score < 0.1

    def test_moving_frames_high_motion(self):
        frames = _make_moving_frames(10)
        score = analyze_motion(frames)
        assert score > 0.5

    def test_single_frame_returns_zero(self):
        frames = _make_static_frames(1)
        score = analyze_motion(frames)
        assert score == 0.0

    def test_empty_frames_returns_zero(self):
        score = analyze_motion([])
        assert score == 0.0


class TestBrightnessAnalyzer:
    """Tests for the brightness analyzer."""

    def test_dark_frames_low_score(self):
        frames = _make_dark_frames(5)
        score = analyze_brightness(frames)
        assert score < 0.15

    def test_bright_frames_high_score(self):
        frames = _make_bright_frames(5)
        score = analyze_brightness(frames)
        assert score > 0.85

    def test_medium_frames_medium_score(self):
        frames = _make_static_frames(5)  # 128 luminance
        score = analyze_brightness(frames)
        assert 0.4 < score < 0.6

    def test_empty_frames_returns_default(self):
        score = analyze_brightness([])
        assert score == 0.5


class TestNoiseAnalyzer:
    """Tests for the noise analyzer."""

    def test_clean_frames_low_noise(self):
        frames = _make_static_frames(5)
        score = analyze_noise(frames)
        assert score < 0.1

    def test_noisy_frames_high_noise(self):
        frames = _make_noisy_frames(5)
        score = analyze_noise(frames)
        assert score > 0.3

    def test_empty_frames_returns_zero(self):
        score = analyze_noise([])
        assert score == 0.0


class TestOptimizationEngine:
    """Tests for the main optimization engine."""

    def test_file_not_found(self):
        with pytest.raises(OptimizationEngineError) as exc_info:
            run_analysis("/nonexistent/video.mp4", "test-id")
        assert exc_info.value.code == "FILE_NOT_FOUND"

    @patch("app.ai.optimization_engine.engine.sample_frames")
    def test_corrupted_video_no_frames(self, mock_sample, tmp_path):
        video_file = tmp_path / "corrupt.mp4"
        video_file.write_bytes(b"\x00" * 100)
        mock_sample.return_value = []

        with patch("app.ai.optimization_engine.engine.get_settings") as mock_settings:
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")

            with pytest.raises(OptimizationEngineError) as exc_info:
                run_analysis(str(video_file), "test-id")
            assert exc_info.value.code == "FRAME_EXTRACTION_FAILED"

    @patch("app.ai.optimization_engine.engine.sample_frames")
    def test_successful_analysis(self, mock_sample, tmp_path):
        video_file = tmp_path / "test.mp4"
        video_file.write_bytes(b"\x00" * 1024)
        mock_sample.return_value = _make_static_frames(10)

        with patch("app.ai.optimization_engine.engine.get_settings") as mock_settings:
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")

            result = run_analysis(str(video_file), "test-video-id")

        assert result["video_id"] == "test-video-id"
        assert "scores" in result
        assert "motion" in result["scores"]
        assert "brightness" in result["scores"]
        assert "noise" in result["scores"]
        assert "compression_potential" in result
        assert "confidence" in result
        assert "recommended_profile" in result
        assert "reasoning" in result
        assert result["status"] == "analysis_complete"
        assert result["recommended_profile"] in ["archive_mode", "balanced_mode", "evidence_mode"]

    def test_get_stored_analysis_not_found(self, tmp_path):
        with patch("app.ai.optimization_engine.engine.get_settings") as mock_settings:
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")
            result = get_stored_analysis("nonexistent")
        assert result is None

    @patch("app.ai.optimization_engine.engine.sample_frames")
    def test_analysis_saved_to_reports(self, mock_sample, tmp_path):
        video_file = tmp_path / "test.mp4"
        video_file.write_bytes(b"\x00" * 1024)
        mock_sample.return_value = _make_static_frames(10)

        with patch("app.ai.optimization_engine.engine.get_settings") as mock_settings:
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")
            run_analysis(str(video_file), "save-test-id")
            report_path = tmp_path / "storage" / "reports" / "save-test-id_analysis.json"
            assert report_path.exists()
            data = json.loads(report_path.read_text())
            assert data["video_id"] == "save-test-id"
