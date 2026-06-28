"""Video compression service using FFmpeg H.265 encoding."""

import json
import subprocess
import time
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.logger import get_logger

logger = get_logger("services.compression")

# In-memory progress tracking
_compression_progress: dict[str, dict] = {}

# NVENC availability cached at module level — avoids subprocess call per job
_nvenc_available: Optional[bool] = None
_nvenc_lock = threading.Lock()


class CompressionError(Exception):
    """Raised when compression fails."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


# Compression profiles
PROFILES = {
    "archive": {
        "name": "Archive Mode",
        "description": "Maximum storage saving — aggressive compression",
        "crf": 30,
        "preset": "medium",
        "bitrate_factor": 0.3,
    },
    "balanced": {
        "name": "Balanced Mode",
        "description": "Recommended default — optimal size-to-quality ratio",
        "crf": 25,
        "preset": "medium",
        "bitrate_factor": 0.5,
    },
    "evidence": {
        "name": "Evidence Mode",
        "description": "Maximum visual quality — preserve forensic detail",
        "crf": 20,
        "preset": "slow",
        "bitrate_factor": 0.8,
    },
}


def detect_nvenc_available() -> bool:
    """Check if NVIDIA NVENC (hevc_nvenc) encoder is available.
    Result is cached after first call.
    """
    global _nvenc_available
    with _nvenc_lock:
        if _nvenc_available is not None:
            return _nvenc_available
        settings = get_settings()
        try:
            result = subprocess.run(
                [settings.FFMPEG_PATH, "-hide_banner", "-encoders"],
                capture_output=True, text=True, timeout=10,
            )
            _nvenc_available = "hevc_nvenc" in result.stdout
        except (FileNotFoundError, subprocess.TimeoutExpired):
            _nvenc_available = False
        logger.info(f"NVENC availability cached: {_nvenc_available}")
        return _nvenc_available


def get_encoder() -> tuple[str, str]:
    """Select the best available H.265 encoder.

    Returns:
        Tuple of (encoder_name, display_name).
    """
    if detect_nvenc_available():
        logger.info("NVIDIA NVENC detected — using hevc_nvenc")
        return "hevc_nvenc", "NVENC (GPU)"
    logger.info("Using software encoder libx265")
    return "libx265", "libx265 (CPU)"


def get_progress(video_id: str) -> Optional[dict]:
    """Get current compression progress for a video."""
    return _compression_progress.get(video_id)


def compress_video(video_id: str, input_path: str, profile: str = "balanced") -> dict:
    """Compress a video using FFmpeg H.265 with the specified profile.

    Args:
        video_id: Unique video identifier.
        input_path: Path to original video file.
        profile: Compression profile (archive/balanced/evidence).

    Returns:
        Compression report dictionary.

    Raises:
        CompressionError: If compression fails.
    """
    # Map friendly/user-selected profiles to internal keys
    profile_map = {
        "maximum_storage": "archive",
        "archive": "archive",
        "balanced": "balanced",
        "maximum_quality": "evidence",
        "evidence": "evidence",
    }
    profile_clean = profile_map.get(profile.lower().replace(" ", "_"), None)
    if not profile_clean:
        if profile in PROFILES:
            profile_clean = profile
        else:
            raise CompressionError(
                code="INVALID_PROFILE",
                message=f"Invalid profile '{profile}'. Valid: {list(PROFILES.keys())}",
            )

    input_file = Path(input_path)
    if not input_file.exists():
        raise CompressionError(code="FILE_NOT_FOUND", message=f"Input file not found: {input_path}")

    settings = get_settings()
    compressed_dir = Path(settings.STORAGE_DIRECTORY) / "compressed"
    compressed_dir.mkdir(parents=True, exist_ok=True)
    output_path = compressed_dir / f"{video_id}.mp4"

    profile_config = PROFILES[profile_clean]
    encoder, encoder_display = get_encoder()

    # Initialize progress
    _compression_progress[video_id] = {
        "video_id": video_id,
        "status": "compressing",
        "progress_percent": 0,
        "profile": profile_clean,
        "encoder": encoder_display,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info(f"Compression started: video_id={video_id}, profile={profile_clean} ({profile}), encoder={encoder}")

    # Get video duration for progress calculation
    duration = _get_duration(input_path)

    # Get original video details
    original_size = input_file.stat().st_size
    original_bitrate = _get_bitrate_kbps(input_path)
    original_codec = _get_codec(input_path)

    # Calculate target bitrate
    bitrate_factor = profile_config["bitrate_factor"]
    if original_bitrate > 0:
        raw_target = original_bitrate * bitrate_factor
        # Enforce floors
        floor = 200 if profile_clean == "archive" else 400 if profile_clean == "balanced" else 800
        target_bitrate = int(max(floor, raw_target))
        # Ensure it doesn't exceed original_bitrate * max(0.85, bitrate_factor)
        upper_limit = int(original_bitrate * max(0.85, bitrate_factor))
        if target_bitrate > upper_limit:
            target_bitrate = upper_limit
        if target_bitrate >= original_bitrate:
            target_bitrate = int(original_bitrate * 0.8)
        target_bitrate = max(50, target_bitrate)
    else:
        target_bitrate = 800 if profile_clean == "archive" else 1500 if profile_clean == "balanced" else 3000

    # Build FFmpeg command
    command = _build_ffmpeg_command(
        input_path=str(input_file),
        output_path=str(output_path),
        encoder=encoder,
        crf=profile_config["crf"],
        preset=profile_config["preset"],
        target_bitrate=target_bitrate,
    )

    start_time = time.time()

    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        # Read stderr for progress (FFmpeg outputs progress to stderr)
        stderr_output = ""
        for line in iter(process.stderr.readline, ""):
            stderr_output += line
            if "time=" in line and duration > 0:
                current_time = _parse_time_from_line(line)
                if current_time > 0:
                    pct = min(int((current_time / duration) * 100), 99)
                    _compression_progress[video_id]["progress_percent"] = pct

        process.wait()

        if process.returncode != 0:
            logger.error(f"FFmpeg failed: video_id={video_id}, stderr={stderr_output[-500:]}")
            _compression_progress[video_id]["status"] = "failed"
            raise CompressionError(
                code="COMPRESSION_FAILED",
                message=f"FFmpeg exited with code {process.returncode}",
            )

    except FileNotFoundError:
        _compression_progress[video_id]["status"] = "failed"
        raise CompressionError(
            code="FFMPEG_NOT_FOUND",
            message="FFmpeg is not installed or not found in PATH.",
        )

    processing_time_ms = int((time.time() - start_time) * 1000)

    # Calculate metrics based on the actual output file size
    compressed_size = output_path.stat().st_size
    raw_saved_pct = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
    space_saved_percent = round(max(0.0, min(100.0, raw_saved_pct)), 2)
    compression_ratio = round(original_size / compressed_size, 2) if compressed_size > 0 else 1.0

    # Output bitrate calculation
    output_bitrate = 0
    if duration > 0:
        output_bitrate = int((compressed_size * 8) / (duration * 1000))

    # Log comprehensive diagnostics
    logger.info(
        f"\n=== Video Compression Diagnostics ===\n"
        f"Original File Size: {original_size} bytes\n"
        f"Original Bitrate: {original_bitrate} kbps\n"
        f"Original Codec: {original_codec}\n"
        f"Compression Profile Selected: {profile_clean} ({profile})\n"
        f"FFmpeg Command Executed: {' '.join(command)}\n"
        f"Encoder Used: {encoder} ({encoder_display})\n"
        f"Target Bitrate / CQ / CRF: Target Bitrate = {target_bitrate} kbps, CQ/CRF = {profile_config['crf']}\n"
        f"Output Bitrate: {output_bitrate} kbps\n"
        f"Output File Size: {compressed_size} bytes\n"
        f"====================================="
    )

    # Run quality verification — SSIM and PSNR in a single FFmpeg pass
    quality = _verify_quality(str(input_file), str(output_path))

    # Build report
    report = {
        "video_id": video_id,
        "profile": profile_clean,
        "profile_name": profile_config["name"],
        "encoder": encoder_display,
        "original_size_bytes": original_size,
        "compressed_size_bytes": compressed_size,
        "space_saved_percent": space_saved_percent,
        "compression_ratio": compression_ratio,
        "processing_time_ms": processing_time_ms,
        "quality": quality,
        "input_path": str(input_file),
        "output_path": str(output_path),
        "compressed_at": datetime.now(timezone.utc).isoformat(),
        "status": "completed",
    }

    # Save report
    _save_compression_report(report, video_id)

    # Update progress to complete
    _compression_progress[video_id] = {
        "video_id": video_id,
        "status": "completed",
        "progress_percent": 100,
        "profile": profile_clean,
        "encoder": encoder_display,
        "started_at": _compression_progress[video_id]["started_at"],
        "completed_at": report["compressed_at"],
    }

    return report


def _build_ffmpeg_command(
    input_path: str, output_path: str, encoder: str, crf: int, preset: str, target_bitrate: int = 1000
) -> list[str]:
    """Build the FFmpeg command with appropriate encoder parameters and bitrate constraints."""
    settings = get_settings()
    cmd = [
        settings.FFMPEG_PATH,
        "-y",
        "-i", input_path,
        "-c:v", encoder,
        "-movflags", "+faststart",
        "-c:a", "copy",
    ]

    if encoder == "hevc_nvenc":
        # For NVENC: use quality-based control (cq) in VBR mode, capped by maxrate
        nvenc_preset = "p7" if crf <= 20 else "p4"
        cmd.extend([
            "-rc", "vbr",
            "-cq", str(crf),
            "-b:v", "0",
            "-maxrate", f"{target_bitrate}k",
            "-bufsize", f"{2 * target_bitrate}k",
            "-preset", nvenc_preset,
        ])
    else:
        cmd.extend([
            "-crf", str(crf),
            "-maxrate", f"{target_bitrate}k",
            "-bufsize", f"{2 * target_bitrate}k",
            "-preset", preset,
        ])

    cmd.append(output_path)
    return cmd


def _get_duration(file_path: str) -> float:
    """Get video duration in seconds using FFprobe."""
    settings = get_settings()
    try:
        result = subprocess.run(
            [settings.FFPROBE_PATH, "-v", "quiet", "-show_entries",
             "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            capture_output=True, text=True, timeout=30,
        )
        return float(result.stdout.strip()) if result.stdout.strip() else 0.0
    except (subprocess.TimeoutExpired, ValueError, FileNotFoundError):
        return 0.0


def _get_bitrate_kbps(file_path: str) -> int:
    """Get video bitrate in kbps using FFprobe, falling back to file size/duration calculation."""
    settings = get_settings()
    # Try probing via FFprobe first
    try:
        result = subprocess.run(
            [
                settings.FFPROBE_PATH,
                "-v", "quiet",
                "-show_entries", "format=bit_rate",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        val = result.stdout.strip()
        if val and val.isdigit() and int(val) > 0:
            return int(int(val) / 1000)
    except Exception:
        pass

    # Fallback to file size / duration calculation
    try:
        path = Path(file_path)
        size = path.stat().st_size
        duration = _get_duration(file_path)
        if size > 0 and duration > 0:
            return int((size * 8) / (duration * 1000))
    except Exception:
        pass
    return 0


def _get_codec(file_path: str) -> str:
    """Get the video codec name using FFprobe."""
    settings = get_settings()
    try:
        result = subprocess.run(
            [
                settings.FFPROBE_PATH,
                "-v", "quiet",
                "-show_entries", "stream=codec_name",
                "-select_streams", "v:0",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def _parse_time_from_line(line: str) -> float:
    """Parse time= field from FFmpeg progress output."""
    try:
        if "time=" not in line:
            return 0.0
        time_str = line.split("time=")[1].split()[0]
        parts = time_str.split(":")
        if len(parts) == 3:
            h, m, s = parts
            return int(h) * 3600 + int(m) * 60 + float(s)
    except (IndexError, ValueError):
        pass
    return 0.0


def _verify_quality(original_path: str, compressed_path: str) -> dict:
    """Calculate SSIM and PSNR between original and compressed video.

    Uses a single FFmpeg filtergraph pass for both metrics, cutting
    processing time roughly in half compared to two separate runs.
    """
    settings = get_settings()
    quality = {"ssim": None, "psnr": None}

    try:
        # Combined SSIM + PSNR in one decode pass using complex filtergraph
        result = subprocess.run(
            [
                settings.FFMPEG_PATH,
                "-i", compressed_path,
                "-i", original_path,
                "-filter_complex", "[0][1]ssim;[0][1]psnr",
                "-f", "null", "-",
            ],
            capture_output=True, text=True, timeout=180,
        )

        for line in result.stderr.split("\n"):
            if "SSIM" in line and "All:" in line:
                try:
                    ssim_str = line.split("All:")[1].split()[0]
                    quality["ssim"] = round(float(ssim_str), 4)
                except (IndexError, ValueError):
                    pass
            if "PSNR" in line and "average:" in line:
                try:
                    psnr_str = line.split("average:")[1].split()[0]
                    quality["psnr"] = round(float(psnr_str), 2)
                except (IndexError, ValueError):
                    pass

    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        logger.warning(f"Quality verification failed: {e}. Falling back to SSIM-only.")
        # Fallback: try individual SSIM only
        try:
            result = subprocess.run(
                [settings.FFMPEG_PATH, "-i", compressed_path, "-i", original_path,
                 "-lavfi", "ssim", "-f", "null", "-"],
                capture_output=True, text=True, timeout=120,
            )
            for line in result.stderr.split("\n"):
                if "All:" in line:
                    ssim_str = line.split("All:")[1].split()[0]
                    quality["ssim"] = round(float(ssim_str), 4)
                    break
        except Exception:
            logger.warning("SSIM fallback also failed")

    return quality


def _save_compression_report(report: dict, video_id: str) -> Path:
    """Save compression report as JSON."""
    settings = get_settings()
    reports_dir = Path(settings.STORAGE_DIRECTORY) / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    output_path = reports_dir / f"{video_id}_compression.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    return output_path


def get_compression_report(video_id: str) -> Optional[dict]:
    """Load compression report from stored JSON. Returns None if not found."""
    settings = get_settings()
    report_path = Path(settings.STORAGE_DIRECTORY) / "reports" / f"{video_id}_compression.json"
    if not report_path.exists():
        return None
    with open(report_path, "r", encoding="utf-8") as f:
        return json.load(f)
