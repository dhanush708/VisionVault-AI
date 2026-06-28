"""AWS client initialization helpers.

Provides factory functions for creating boto3 clients.
Supports standard IAM credentials and STS temporary session tokens.
"""

import boto3
from app.config import get_settings


def _find_aws_session_env_path():
    import os
    from pathlib import Path
    current = Path(os.getcwd()).resolve()
    for p in [current, current.parent, current.parent.parent]:
        candidate = p / "aws_session.env"
        if candidate.exists():
            return candidate
    return None


def load_aws_session_env() -> dict:
    path = _find_aws_session_env_path()
    if not path:
        return {}
    
    creds = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                creds[k.strip()] = v.strip()
    except Exception:
        pass
    return creds


def get_aws_credentials_metadata() -> dict:
    import os
    from app.config import get_settings
    
    settings = get_settings()
    session_creds = load_aws_session_env()
    
    access_key = session_creds.get("AWS_ACCESS_KEY_ID")
    secret_key = session_creds.get("AWS_SECRET_ACCESS_KEY")
    session_token = session_creds.get("AWS_SESSION_TOKEN")
    region = session_creds.get("AWS_REGION")
    expiration = session_creds.get("EXPIRATION")
    source = "aws_session.env"
    
    path = _find_aws_session_env_path()
    if path and (not access_key or not secret_key):
        access_key = None
        session_token = None
        region = None
        expiration = None
    
    if not access_key:
        access_key = os.environ.get("AWS_ACCESS_KEY_ID")
        session_token = os.environ.get("AWS_SESSION_TOKEN")
        region = os.environ.get("AWS_REGION")
        expiration = None
        source = "Environment Variables"
        
    if not access_key:
        access_key = settings.AWS_ACCESS_KEY_ID
        session_token = settings.AWS_SESSION_TOKEN
        region = settings.AWS_REGION
        expiration = None
        source = "Config Settings (.env)"
        
    session_type = "Temporary" if session_token else "Permanent" if access_key else "None"
    
    return {
        "credential_source": source,
        "session_type": session_type,
        "expiration": expiration or "None",
        "region": region or settings.AWS_REGION or "us-east-1"
    }


def _make_kwargs() -> dict:
    """Build boto3 credential kwargs from aws_session.env, environment, or settings."""
    import os
    from app.logger import get_logger
    
    logger = get_logger("aws.client")
    settings = get_settings()
    
    session_creds = load_aws_session_env()
    
    access_key = session_creds.get("AWS_ACCESS_KEY_ID")
    secret_key = session_creds.get("AWS_SECRET_ACCESS_KEY")
    session_token = session_creds.get("AWS_SESSION_TOKEN")
    region = session_creds.get("AWS_REGION")
    expiration = session_creds.get("EXPIRATION")
    
    source = "aws_session.env"
    path = _find_aws_session_env_path()
    
    if path:
        if not access_key or not secret_key:
            logger.warning("AWS Session file (aws_session.env) is present but incomplete. Falling back to default credential sources.")
            access_key = None
            secret_key = None
            session_token = None
            region = None
    else:
        logger.warning("AWS Session file (aws_session.env) not found. Using default credential chain.")
        
    if not access_key:
        access_key = os.environ.get("AWS_ACCESS_KEY_ID")
        secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        session_token = os.environ.get("AWS_SESSION_TOKEN")
        region = os.environ.get("AWS_REGION")
        source = "Environment Variables"
        
    if not access_key:
        access_key = settings.AWS_ACCESS_KEY_ID
        secret_key = settings.AWS_SECRET_ACCESS_KEY
        session_token = settings.AWS_SESSION_TOKEN
        region = settings.AWS_REGION
        source = "Config Settings (.env)"
        
    kwargs = {}
    if region and region.strip():
        kwargs["region_name"] = region.strip()
    else:
        kwargs["region_name"] = settings.AWS_REGION or "us-east-1"
        
    if access_key and access_key.strip():
        kwargs["aws_access_key_id"] = access_key.strip()
    if secret_key and secret_key.strip():
        kwargs["aws_secret_access_key"] = secret_key.strip()
    if session_token and session_token.strip():
        kwargs["aws_session_token"] = session_token.strip()
        
    if access_key and access_key.strip():
        session_type = "Temporary" if (session_token and session_token.strip()) else "Permanent"
        logger.info(
            f"\nAWS Session Loaded\n"
            f"Source: {source}\n"
            f"Region: {kwargs.get('region_name')}\n"
            f"Session: {session_type}\n"
            f"Expiration: {expiration or 'None'}"
        )
        
    return kwargs



def get_s3_client():
    """Create and return a boto3 S3 client configured from settings."""
    return boto3.client("s3", **_make_kwargs())


def get_dynamodb_resource():
    """Create and return a boto3 DynamoDB resource configured from settings."""
    return boto3.resource("dynamodb", **_make_kwargs())


def get_bedrock_client():
    """Create and return a boto3 Bedrock Runtime client configured from settings."""
    return boto3.client("bedrock-runtime", **_make_kwargs())


def get_cloudwatch_client():
    """Create and return a boto3 CloudWatch client configured from settings."""
    return boto3.client("cloudwatch", **_make_kwargs())
