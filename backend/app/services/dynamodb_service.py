"""Amazon DynamoDB service for video metadata persistence."""

import json
from datetime import datetime, timezone
from typing import Optional

from app.aws.client import get_dynamodb_resource
from app.config import get_settings
from app.logger import get_logger

logger = get_logger("services.dynamodb")


class DynamoDBServiceError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def save_video_record(record: dict) -> bool:
    """Save a complete video record to DynamoDB.

    The record should contain all metadata, analysis, compression, and S3 data.
    """
    settings = get_settings()
    try:
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(settings.DYNAMODB_TABLE)
        table.put_item(Item=_sanitize_for_dynamodb(record))
        logger.info(
            f"[AWS Operation] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=put_item, Success=True"
        )
        return True
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(
            f"[AWS Operation] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=put_item, Success=False, FailureReason={err_msg}, "
            f"FallbackReason=Falling back to local SQLite/JSON storage"
        )
        _save_local_fallback(record)
        return False


def get_video_record(video_id: str) -> Optional[dict]:
    """Retrieve a video record from DynamoDB."""
    settings = get_settings()
    try:
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(settings.DYNAMODB_TABLE)
        response = table.get_item(Key={"video_id": video_id})
        logger.info(
            f"[AWS Operation] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=get_item, Success=True"
        )
        return response.get("Item")
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(
            f"[AWS Operation] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=get_item, Success=False, FailureReason={err_msg}, "
            f"FallbackReason=Falling back to local SQLite/JSON storage"
        )
        return _load_local_fallback(video_id)



def _sanitize_for_dynamodb(record: dict) -> dict:
    """Convert float values to Decimal-safe strings for DynamoDB."""
    import decimal

    def _sanitize(value):
        if isinstance(value, dict):
            return {k: _sanitize(v) for k, v in value.items() if v is not None}
        elif isinstance(value, list):
            return [_sanitize(v) for v in value if v is not None]
        elif isinstance(value, float):
            return decimal.Decimal(str(round(value, 6)))
        else:
            return value

    return _sanitize(record)


def _save_local_fallback(record: dict) -> None:
    """Save record locally when DynamoDB is not available."""
    from pathlib import Path
    settings = get_settings()
    db_dir = Path(settings.STORAGE_DIRECTORY) / "db"
    db_dir.mkdir(parents=True, exist_ok=True)
    video_id = record.get("video_id", "unknown")
    path = db_dir / f"{video_id}.json"
    with open(path, "w") as f:
        json.dump(record, f, indent=2, default=str)
    logger.info(f"Local fallback saved: {path}")


def _load_local_fallback(video_id: str) -> Optional[dict]:
    """Load record from local fallback."""
    from pathlib import Path
    settings = get_settings()
    path = Path(settings.STORAGE_DIRECTORY) / "db" / f"{video_id}.json"
    if not path.exists():
        return None
    with open(path, "r") as f:
        return json.load(f)


def list_video_records() -> list[dict]:
    """Retrieve all video records from DynamoDB (or local fallback)."""
    settings = get_settings()
    try:
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(settings.DYNAMODB_TABLE)
        response = table.scan()
        items = response.get("Items", [])
        
        while "LastEvaluatedKey" in response:
            response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items", []))
            
        logger.info(
            f"[AWS Operation] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=scan, Success=True, ItemCount={len(items)}"
        )
        return items
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(
            f"[AWS Operation] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=scan, Success=False, FailureReason={err_msg}, "
            f"FallbackReason=Falling back to local storage directory"
        )
        # Fallback: scan local db folder for JSON files
        from pathlib import Path
        db_dir = Path(settings.STORAGE_DIRECTORY) / "db"
        if not db_dir.exists():
            return []
        records = []
        for path in db_dir.glob("*.json"):
            try:
                with open(path, "r") as f:
                    records.append(json.load(f))
            except Exception:
                pass
        return records


def delete_video_record(video_id: str) -> bool:
    """Delete a video record from DynamoDB (and local fallback)."""
    settings = get_settings()
    try:
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(settings.DYNAMODB_TABLE)
        table.delete_item(Key={"video_id": video_id})
        logger.info(
            f"[AWS Operation] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=delete_item, Key={video_id}, Success=True"
        )
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(
            f"[AWS Operation] Service=DynamoDB, Region={settings.AWS_REGION}, Table={settings.DYNAMODB_TABLE}, "
            f"Request=delete_item, Key={video_id}, Success=False, FailureReason={err_msg}"
        )
    
    from pathlib import Path
    local_path = Path(settings.STORAGE_DIRECTORY) / "db" / f"{video_id}.json"
    if local_path.exists():
        try:
            local_path.unlink()
        except Exception:
            pass
            
    return True

