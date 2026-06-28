"""Tests for the AI enhancement service and pipeline router additions."""

import json
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.enhancement_service import (
    start_enhancement,
    get_enhancement_state,
    get_stored_enhancement,
    _generate_executive_report,
    EnhancementError,
)

client = TestClient(app)


class TestEnhancementEndpoints:
    """Tests for the AI enhancement API endpoints."""

    @patch("app.services.enhancement_service.Path.exists")
    def test_enhance_video_not_found(self, mock_exists):
        mock_exists.return_value = False
        response = client.post("/api/v1/pipeline/nonexistent/enhance")
        assert response.status_code == 404
        assert "VIDEO_NOT_FOUND" in response.text or "FILE_NOT_FOUND" in response.text

    @patch("app.services.enhancement_service.Path.exists")
    @patch("app.services.enhancement_service.threading.Thread")
    def test_enhance_video_starts_successfully(self, mock_thread, mock_exists):
        mock_exists.return_value = True
        
        # Clear any existing in-memory state
        import app.services.enhancement_service as es
        if "test_video_123" in es._enhancement_state:
            del es._enhancement_state["test_video_123"]

        response = client.post("/api/v1/pipeline/test_video_123/enhance")
        assert response.status_code == 200
        data = response.json()
        assert data["video_id"] == "test_video_123"
        assert data["state"]["status"] == "processing"
        assert data["state"]["gpu_name"] is not None

    def test_enhance_status_not_found(self):
        response = client.get("/api/v1/pipeline/nonexistent_status/enhance/status")
        assert response.status_code == 404

    @patch("app.routers.pipeline.get_stored_enhancement")
    def test_enhance_status_found(self, mock_stored):
        mock_stored.return_value = {
            "video_id": "test_video_status",
            "status": "completed",
            "progress_percent": 100,
            "gpu_name": "NVIDIA GeForce RTX 4060 Laptop GPU",
            "vram_used_mb": 1150,
            "total_frames": 300,
            "output_resolution": "3840x2160",
        }

        # Ensure not in memory to force checking stored
        import app.services.enhancement_service as es
        if "test_video_status" in es._enhancement_state:
            del es._enhancement_state["test_video_status"]

        response = client.get("/api/v1/pipeline/test_video_status/enhance/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["gpu_name"] == "NVIDIA GeForce RTX 4060 Laptop GPU"
        assert data["vram_used_mb"] == 1150


class TestEnhancementReportAndDownloads:
    """Tests for the generated executive reports and download parameters."""

    @patch("app.routers.pipeline.Path.exists")
    def test_get_report_not_found(self, mock_exists):
        mock_exists.return_value = False
        response = client.get("/api/v1/pipeline/no_report_video/enhance/report")
        assert response.status_code == 404

    @patch("app.routers.pipeline.Path.exists")
    @patch("app.routers.pipeline.open")
    def test_get_report_found(self, mock_open, mock_exists):
        mock_exists.return_value = True
        
        mock_report_json = {
            "video_id": "test_video_report",
            "device": "NVIDIA GeForce RTX 4060 Laptop GPU",
            "model_used": "Real-ESRGAN RRDBNet x4plus",
            "video_metrics": {
                "original_resolution": "1920x1080",
                "output_resolution": "3840x2160",
                "restored_ssim": 0.985,
            },
            "forensic_analysis": "Test audit narrative."
        }
        
        mock_open.return_value.__enter__.return_value.read.return_value = json.dumps(mock_report_json)

        response = client.get("/api/v1/pipeline/test_video_report/enhance/report")
        assert response.status_code == 200
        data = response.json()
        assert data["device"] == "NVIDIA GeForce RTX 4060 Laptop GPU"
        assert data["video_metrics"]["output_resolution"] == "3840x2160"

    def test_download_video_inline(self, tmp_path):
        # Create a real temporary file to bypass os.stat check in FileResponse
        dummy_video = tmp_path / "test_original.mp4"
        dummy_video.write_bytes(b"dummy video data")

        # Patch _find_video and Path exists to return our temp file
        with patch("app.routers.pipeline._find_video") as mock_find:
            mock_find.return_value = dummy_video

            # Test download standard (attachment)
            response = client.get("/api/v1/pipeline/test_dl/download/original")
            assert response.status_code == 200
            assert "attachment" in response.headers["content-disposition"]

            # Test download inline
            response = client.get("/api/v1/pipeline/test_dl/download/original?inline=true")
            assert response.status_code == 200
            assert response.headers["content-disposition"] == "inline"
