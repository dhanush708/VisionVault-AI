"""Tests for the pipeline service and endpoints."""

from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestAwsStatusEndpoint:
    """Tests for the AWS status endpoint."""

    def test_aws_status_returns_services(self):
        response = client.get("/api/v1/pipeline/aws/status")
        assert response.status_code == 200
        data = response.json()
        assert "services" in data
        assert "s3" in data["services"]
        assert "dynamodb" in data["services"]
        assert "bedrock" in data["services"]
        assert "region" in data

    def test_aws_status_without_credentials(self):
        response = client.get("/api/v1/pipeline/aws/status")
        data = response.json()
        # Without credentials, services should be in local/simulated mode
        assert data["services"]["s3"]["status"] in ["connected", "simulated"]
        assert data["services"]["dynamodb"]["status"] in ["connected", "local_fallback"]
        assert data["services"]["bedrock"]["status"] in ["connected", "local_generation"]


class TestPipelineEndpoints:
    """Tests for pipeline state endpoints."""

    def test_get_state_not_found(self):
        response = client.get("/api/v1/pipeline/nonexistent/state")
        assert response.status_code == 404

    def test_get_result_not_found(self):
        response = client.get("/api/v1/pipeline/nonexistent/result")
        assert response.status_code == 404

    def test_start_pipeline_video_not_found(self):
        response = client.post("/api/v1/pipeline/start", json={"video_id": "nonexistent", "profile": "balanced"})
        assert response.status_code == 404

    def test_thumbnail_not_found(self):
        response = client.get("/api/v1/pipeline/nonexistent/thumbnail")
        assert response.status_code == 404
