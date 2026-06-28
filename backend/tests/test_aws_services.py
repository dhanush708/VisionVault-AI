"""Tests for AWS services (S3, DynamoDB, Bedrock)."""

import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from app.services.s3_service import upload_file_to_s3, upload_video_pair
from app.services.dynamodb_service import save_video_record, get_video_record, _save_local_fallback, _load_local_fallback
from app.services.bedrock_service import generate_business_summary, _generate_local_summary


class TestS3Service:
    """Tests for S3 upload service."""

    def test_upload_without_credentials_simulates(self, tmp_path):
        video_file = tmp_path / "test.mp4"
        video_file.write_bytes(b"\x00" * 100)

        with patch("app.services.s3_service.get_settings") as mock_settings:
            mock_settings.return_value.AWS_ACCESS_KEY_ID = ""
            mock_settings.return_value.S3_BUCKET_NAME = "test-bucket"
            result = upload_file_to_s3(str(video_file), "videos/test.mp4")
        assert "simulated" in result

    def test_upload_video_pair_returns_both_keys(self, tmp_path):
        original = tmp_path / "vid.mp4"
        compressed = tmp_path / "vid_c.mp4"
        original.write_bytes(b"\x00" * 100)
        compressed.write_bytes(b"\x00" * 50)

        with patch("app.services.s3_service.get_settings") as mock_settings:
            mock_settings.return_value.AWS_ACCESS_KEY_ID = ""
            mock_settings.return_value.S3_BUCKET_NAME = "test-bucket"
            result = upload_video_pair("test-id", str(original), str(compressed))

        assert "original_s3_key" in result
        assert "compressed_s3_key" in result
        assert result["original_s3_key"] is None


class TestDynamoDBService:
    """Tests for DynamoDB service."""

    def test_save_and_load_local_fallback(self, tmp_path):
        record = {"video_id": "test-123", "status": "completed", "size": 1024}

        with patch("app.services.dynamodb_service.get_settings") as mock_settings:
            mock_settings.return_value.AWS_ACCESS_KEY_ID = ""
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")
            save_video_record(record)
            loaded = get_video_record("test-123")

        assert loaded is not None
        assert loaded["video_id"] == "test-123"

    def test_get_nonexistent_record(self, tmp_path):
        with patch("app.services.dynamodb_service.get_settings") as mock_settings:
            mock_settings.return_value.AWS_ACCESS_KEY_ID = ""
            mock_settings.return_value.STORAGE_DIRECTORY = str(tmp_path / "storage")
            result = get_video_record("nonexistent")
        assert result is None


class TestBedrockService:
    """Tests for Bedrock summary generation."""

    def test_local_summary_generation(self):
        video_data = {
            "metadata": {"file_name": "cam1.mp4", "duration_seconds": 60, "resolution": "1920x1080"},
            "compression": {
                "original_size_bytes": 100_000_000,
                "compressed_size_bytes": 30_000_000,
                "space_saved_percent": 70.0,
                "compression_ratio": 3.33,
                "profile_name": "Balanced Mode",
                "quality": {"ssim": 0.92, "psnr": 38.5},
            },
        }

        with patch("app.services.bedrock_service.get_settings") as mock_settings:
            mock_settings.return_value.AWS_ACCESS_KEY_ID = ""
            summary = generate_business_summary(video_data)

        assert "Executive Summary" in summary
        assert "70" in summary
        assert "Balanced" in summary

    def test_local_summary_contains_metrics(self):
        video_data = {
            "metadata": {},
            "compression": {
                "original_size_bytes": 500_000_000,
                "compressed_size_bytes": 150_000_000,
                "space_saved_percent": 70.0,
                "compression_ratio": 3.33,
                "profile_name": "Archive Mode",
                "quality": {"ssim": 0.88},
            },
        }
        summary = _generate_local_summary(video_data)
        assert "Storage Savings" in summary
        assert "Business Impact" in summary
        assert "Recommendation" in summary


class TestAWSCredentials:
    """Tests for the dynamic AWS credentials loader (aws_session.env)."""

    def test_load_aws_session_env_missing(self):
        from app.aws.client import load_aws_session_env
        with patch("app.aws.client._find_aws_session_env_path") as mock_find:
            mock_find.return_value = None
            res = load_aws_session_env()
            assert res == {}

    def test_load_aws_session_env_present(self, tmp_path):
        from app.aws.client import load_aws_session_env
        env_file = tmp_path / "aws_session.env"
        env_file.write_text(
            "AWS_ACCESS_KEY_ID=test-key-id\n"
            "AWS_SECRET_ACCESS_KEY=test-secret-key\n"
            "AWS_SESSION_TOKEN=test-token\n"
            "AWS_REGION=us-west-2\n"
            "EXPIRATION=2026-12-31T23:59:59Z\n",
            encoding="utf-8"
        )
        with patch("app.aws.client._find_aws_session_env_path") as mock_find:
            mock_find.return_value = env_file
            res = load_aws_session_env()
            assert res["AWS_ACCESS_KEY_ID"] == "test-key-id"
            assert res["AWS_SECRET_ACCESS_KEY"] == "test-secret-key"
            assert res["AWS_SESSION_TOKEN"] == "test-token"
            assert res["AWS_REGION"] == "us-west-2"
            assert res["EXPIRATION"] == "2026-12-31T23:59:59Z"

    def test_get_aws_credentials_metadata_priority(self, tmp_path):
        from app.aws.client import get_aws_credentials_metadata
        env_file = tmp_path / "aws_session.env"
        env_file.write_text(
            "AWS_ACCESS_KEY_ID=test-key-id\n"
            "AWS_SECRET_ACCESS_KEY=test-secret-key\n"
            "AWS_SESSION_TOKEN=test-token\n"
            "AWS_REGION=us-west-2\n"
            "EXPIRATION=2026-12-31T23:59:59Z\n",
            encoding="utf-8"
        )
        
        # Priority 1: aws_session.env
        with patch("app.aws.client._find_aws_session_env_path", return_value=env_file), \
             patch("app.aws.client.load_aws_session_env", return_value={
                 "AWS_ACCESS_KEY_ID": "test-key-id",
                 "AWS_SECRET_ACCESS_KEY": "test-secret-key",
                 "AWS_SESSION_TOKEN": "test-token",
                 "AWS_REGION": "us-west-2",
                 "EXPIRATION": "2026-12-31T23:59:59Z"
             }):
            meta = get_aws_credentials_metadata()
            assert meta["credential_source"] == "aws_session.env"
            assert meta["session_type"] == "Temporary"
            assert meta["region"] == "us-west-2"
            assert meta["expiration"] == "2026-12-31T23:59:59Z"

        # Priority 2: Environment variables
        with patch("app.aws.client._find_aws_session_env_path", return_value=None), \
             patch("os.environ.get") as mock_env_get:
            def env_side_effect(key, default=None):
                if key == "AWS_ACCESS_KEY_ID":
                    return "env-key"
                if key == "AWS_SECRET_ACCESS_KEY":
                    return "env-secret"
                if key == "AWS_SESSION_TOKEN":
                    return "env-token"
                if key == "AWS_REGION":
                    return "us-east-1"
                return default
            mock_env_get.side_effect = env_side_effect
            meta = get_aws_credentials_metadata()
            assert meta["credential_source"] == "Environment Variables"
            assert meta["session_type"] == "Temporary"
            assert meta["region"] == "us-east-1"
            assert meta["expiration"] == "None"

        # Priority 3: Config settings defaults
        with patch("app.aws.client._find_aws_session_env_path", return_value=None), \
             patch("os.environ.get", return_value=None), \
             patch("app.config.get_settings") as mock_settings:
            mock_settings.return_value.AWS_ACCESS_KEY_ID = "config-key"
            mock_settings.return_value.AWS_SECRET_ACCESS_KEY = "config-secret"
            mock_settings.return_value.AWS_SESSION_TOKEN = ""
            mock_settings.return_value.AWS_REGION = "us-east-1"
            meta = get_aws_credentials_metadata()
            assert meta["credential_source"] == "Config Settings (.env)"
            assert meta["session_type"] == "Permanent"
            assert meta["region"] == "us-east-1"

