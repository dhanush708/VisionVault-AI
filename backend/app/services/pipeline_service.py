"""Pipeline orchestration service — coordinates the full processing workflow."""

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.logger import get_logger
from app.services.metadata_service import extract_metadata, MetadataExtractionError
from app.services.optimization_service import analyze_video
from app.services.compression_service import compress_video, CompressionError
from app.services.s3_service import upload_video_pair, S3ServiceError
from app.services.dynamodb_service import save_video_record
from app.services.bedrock_service import generate_business_summary
from app.services.thumbnail_service import generate_thumbnail
from app.ai.optimization_engine.engine import OptimizationEngineError

logger = get_logger("services.pipeline")

# In-memory pipeline state and activity log
_pipeline_state: dict[str, dict] = {}


def get_pipeline_state(video_id: str) -> Optional[dict]:
    """Get the current pipeline state for a video."""
    return _pipeline_state.get(video_id)


def run_full_pipeline(video_id: str, input_path: str, profile: str = "balanced") -> dict:
    """Run the complete VisionVault processing pipeline.

    Stages: Upload → Metadata → Analysis → Compression → Quality → S3 → DynamoDB → Bedrock
    """
    _pipeline_state[video_id] = {
        "video_id": video_id,
        "status": "processing",
        "current_stage": "metadata",
        "stages": {
            "upload": "completed",
            "metadata": "processing",
            "analysis": "pending",
            "compression": "pending",
            "quality": "pending",
            "s3_upload": "pending",
            "dynamodb": "pending",
            "bedrock": "pending",
        },
        "activity_log": [
            {"timestamp": datetime.now(timezone.utc).isoformat(), "message": "Upload Complete", "stage": "upload"}
        ],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    result = {"video_id": video_id, "metadata": None, "analysis": None, "compression": None, "s3": None, "bedrock_summary": None, "thumbnail_path": None}

    # Generate thumbnail immediately
    thumbnail = generate_thumbnail(input_path, video_id)
    if thumbnail:
        result["thumbnail_path"] = thumbnail
        _pipeline_state[video_id]["thumbnail_path"] = thumbnail
        _log_activity(video_id, "Thumbnail Generated", "upload")

    # Stage 1: Metadata
    _log_activity(video_id, "Extracting video metadata...", "metadata")
    try:
        metadata = extract_metadata(input_path, video_id)
        result["metadata"] = metadata
        _update_stage(video_id, "metadata", "completed")
        _log_activity(video_id, "Metadata Extracted", "metadata")
    except MetadataExtractionError as e:
        _update_stage(video_id, "metadata", "skipped")
        _log_activity(video_id, f"Metadata extraction skipped: {e.message}", "metadata")
        result["metadata"] = {"file_name": Path(input_path).name, "file_size_bytes": Path(input_path).stat().st_size}

    # Stage 2: Analysis
    _update_stage(video_id, "analysis", "processing")
    _pipeline_state[video_id]["current_stage"] = "analysis"
    _log_activity(video_id, "Running Vision Intelligence Analysis...", "analysis")
    try:
        analysis = analyze_video(input_path, video_id)
        result["analysis"] = analysis
        _update_stage(video_id, "analysis", "completed")
        _log_activity(video_id, f"Analysis Complete — Profile: {analysis.get('recommended_profile', 'balanced')}", "analysis")
    except OptimizationEngineError as e:
        _update_stage(video_id, "analysis", "skipped")
        _log_activity(video_id, f"Analysis skipped: {e.message}", "analysis")

    # Stage 3: Compression
    _update_stage(video_id, "compression", "processing")
    _pipeline_state[video_id]["current_stage"] = "compression"
    _log_activity(video_id, f"Starting H.265 Compression ({profile} profile)...", "compression")
    try:
        compression = compress_video(video_id, input_path, profile)
        result["compression"] = compression
        _update_stage(video_id, "compression", "completed")
        _update_stage(video_id, "quality", "completed")
        _log_activity(video_id, f"Compression Complete — Saved {compression.get('space_saved_percent', 0):.1f}%", "compression")
        _log_activity(video_id, f"Quality Verified — SSIM: {compression.get('quality', {}).get('ssim', 'N/A')}", "quality")
    except CompressionError as e:
        _update_stage(video_id, "compression", "failed")
        _log_activity(video_id, f"Compression failed: {e.message}", "compression")
        _pipeline_state[video_id]["status"] = "failed"
        return result

    # Stage 4: S3 Upload
    _update_stage(video_id, "s3_upload", "processing")
    _pipeline_state[video_id]["current_stage"] = "s3_upload"
    _log_activity(video_id, "Uploading to Amazon S3...", "s3_upload")
    try:
        compressed_path = compression.get("output_path", "")
        s3_result = upload_video_pair(video_id, input_path, compressed_path)
        result["s3"] = s3_result
        _update_stage(video_id, "s3_upload", "completed")
        _log_activity(video_id, "Amazon S3 Upload Complete", "s3_upload")
    except S3ServiceError as e:
        _update_stage(video_id, "s3_upload", "skipped")
        _log_activity(video_id, f"S3 upload skipped: {e.message}", "s3_upload")

    # Stage 5: DynamoDB
    _update_stage(video_id, "dynamodb", "processing")
    _pipeline_state[video_id]["current_stage"] = "dynamodb"
    _log_activity(video_id, "Saving to Amazon DynamoDB...", "dynamodb")
    full_record = {
        "video_id": video_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **({k: v for k, v in (result.get("metadata") or {}).items()}),
        "analysis": result.get("analysis", {}),
        "compression": result.get("compression", {}),
        "s3": result.get("s3", {}),
    }
    save_video_record(full_record)
    _update_stage(video_id, "dynamodb", "completed")
    _log_activity(video_id, "Metadata Saved to DynamoDB", "dynamodb")

    # Stage 6: Bedrock
    _update_stage(video_id, "bedrock", "processing")
    _pipeline_state[video_id]["current_stage"] = "bedrock"
    _log_activity(video_id, "Generating Executive Summary (Amazon Bedrock)...", "bedrock")
    summary = generate_business_summary(result)
    result["bedrock_summary"] = summary
    result["summary_source"] = result.get("summary_source", "Local Fallback Template")
    _update_stage(video_id, "bedrock", "completed")
    _log_activity(video_id, f"Executive Summary Generated ({result['summary_source']})", "bedrock")

    # Save final complete record with bedrock summary and source to DynamoDB
    full_record["bedrock_summary"] = summary
    full_record["summary_source"] = result["summary_source"]
    save_video_record(full_record)
    _log_activity(video_id, "Complete Record Updated in DynamoDB", "dynamodb")

    # Complete
    _pipeline_state[video_id]["status"] = "completed"
    _pipeline_state[video_id]["current_stage"] = "completed"
    _pipeline_state[video_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
    _log_activity(video_id, "Pipeline Complete ✓", "completed")

    # Save final state
    _save_pipeline_result(video_id, result)

    return result


def _update_stage(video_id: str, stage: str, status: str):
    if video_id in _pipeline_state:
        _pipeline_state[video_id]["stages"][stage] = status


def _log_activity(video_id: str, message: str, stage: str):
    if video_id in _pipeline_state:
        _pipeline_state[video_id]["activity_log"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": message,
            "stage": stage,
        })
    logger.info(f"[Pipeline {video_id}] {message}")


def _save_pipeline_result(video_id: str, result: dict):
    """Save final pipeline result to storage."""
    settings = get_settings()
    reports_dir = Path(settings.STORAGE_DIRECTORY) / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    path = reports_dir / f"{video_id}_pipeline.json"
    with open(path, "w") as f:
        json.dump(result, f, indent=2, default=str)


def get_pipeline_result(video_id: str) -> Optional[dict]:
    """Load pipeline result from storage."""
    settings = get_settings()
    path = Path(settings.STORAGE_DIRECTORY) / "reports" / f"{video_id}_pipeline.json"
    if not path.exists():
        return None
    with open(path, "r") as f:
        return json.load(f)


def delete_video_completely(video_id: str) -> bool:
    """Delete all S3 objects, local storage assets, and DynamoDB database records for a video."""
    from app.services.dynamodb_service import get_video_record, delete_video_record
    from app.services.s3_service import delete_s3_object
    from app.config import get_settings
    from pathlib import Path
    
    settings = get_settings()
    
    # Try fetching database record to identify S3 keys
    record = get_video_record(video_id)
    if record and "s3" in record:
        s3_data = record["s3"]
        if s3_data.get("original_s3_key"):
            delete_s3_object(s3_data["original_s3_key"])
        if s3_data.get("compressed_s3_key"):
            delete_s3_object(s3_data["compressed_s3_key"])
            
    # Purge database record
    delete_video_record(video_id)
    
    # Purge local files in storage directory
    for subdir in ["original", "compressed", "enhanced", "thumbnails", "reports", "db"]:
        directory = Path(settings.STORAGE_DIRECTORY) / subdir
        if directory.exists():
            for filepath in directory.glob(f"{video_id}*"):
                try:
                    filepath.unlink()
                except Exception as e:
                    logger.warning(f"Could not delete local file {filepath}: {e}")
                    
    # Also clean up in-memory pipeline state if it exists
    if video_id in _pipeline_state:
        del _pipeline_state[video_id]
        
    return True

