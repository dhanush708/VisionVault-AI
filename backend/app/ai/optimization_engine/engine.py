"""VisionVault Optimization Engine — Orchestrates all analyzers and produces compression recommendation."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.logger import get_logger

from .frame_sampler import sample_frames
from .motion_analyzer import analyze_motion
from .brightness_analyzer import analyze_brightness
from .noise_analyzer import analyze_noise
from .sharpness_analyzer import analyze_sharpness
from .edge_density_analyzer import analyze_edge_density
from .scene_complexity_analyzer import analyze_scene_complexity
from .frame_difference_analyzer import analyze_frame_difference
from .entropy_analyzer import analyze_entropy

logger = get_logger("ai.optimization_engine")


class OptimizationEngineError(Exception):
    """Raised when the optimization engine encounters an unrecoverable error."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def run_analysis(video_path: str, video_id: str) -> dict:
    """Run the full VisionVault optimization analysis on a video.

    Executes all 8 analyzers, computes compression potential and confidence,
    selects a compression profile, and generates human-readable reasoning.

    Args:
        video_path: Path to the video file in storage/original/.
        video_id: Unique video identifier.

    Returns:
        Complete analysis result dictionary.

    Raises:
        OptimizationEngineError: If the video cannot be analyzed.
    """
    path = Path(video_path)
    if not path.exists():
        raise OptimizationEngineError(
            code="FILE_NOT_FOUND",
            message=f"Video file not found: {video_path}",
        )

    logger.info(f"Optimization analysis started: video_id={video_id}")

    frames = sample_frames(str(path), max_frames=30, interval=30)
    if not frames:
        raise OptimizationEngineError(
            code="FRAME_EXTRACTION_FAILED",
            message="Could not extract frames from video file. The file may be corrupted or unsupported.",
        )

    # Run all analyzers
    motion_score = analyze_motion(frames)
    brightness_score = analyze_brightness(frames)
    noise_score = analyze_noise(frames)
    sharpness_score = analyze_sharpness(frames)
    edge_density = analyze_edge_density(frames)
    scene_complexity = analyze_scene_complexity(frames)
    frame_diff_variance = analyze_frame_difference(frames)
    entropy_score = analyze_entropy(frames)

    # Compute compression potential
    compression_potential = _compute_compression_potential(
        motion_score, noise_score, scene_complexity, entropy_score, edge_density
    )

    # Compute confidence
    confidence = _compute_confidence(len(frames))

    # Select profile and generate reasoning
    profile, reasoning = _select_profile(
        motion_score, brightness_score, noise_score,
        scene_complexity, entropy_score, compression_potential
    )

    result = {
        "video_id": video_id,
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "scores": {
            "motion": motion_score,
            "brightness": brightness_score,
            "noise": noise_score,
            "sharpness": sharpness_score,
            "edge_density": edge_density,
            "scene_complexity": scene_complexity,
            "frame_difference_variance": frame_diff_variance,
            "entropy": entropy_score,
        },
        "compression_potential": compression_potential,
        "confidence": confidence,
        "recommended_profile": profile,
        "reasoning": reasoning,
        "frames_analyzed": len(frames),
        "status": "analysis_complete",
    }

    _save_analysis_report(result, video_id)

    logger.info(
        f"Analysis complete: video_id={video_id}, "
        f"profile={profile}, potential={compression_potential:.2f}, "
        f"confidence={confidence:.2f}"
    )

    return result


def _compute_compression_potential(
    motion: float, noise: float, scene_complexity: float,
    entropy: float, edge_density: float
) -> float:
    """Compute overall compression potential (0.0 = hard to compress, 1.0 = highly compressible)."""
    # Low motion, low complexity, low entropy = high compression potential
    potential = 1.0 - (
        motion * 0.30 +
        scene_complexity * 0.25 +
        entropy * 0.20 +
        edge_density * 0.15 +
        noise * 0.10
    )
    return round(max(0.0, min(1.0, potential)), 4)


def _compute_confidence(frame_count: int) -> float:
    """Compute analysis confidence based on number of frames analyzed."""
    if frame_count >= 20:
        return 0.95
    elif frame_count >= 10:
        return 0.85
    elif frame_count >= 5:
        return 0.70
    elif frame_count >= 2:
        return 0.50
    return 0.30


def _select_profile(
    motion: float, brightness: float, noise: float,
    scene_complexity: float, entropy: float, compression_potential: float
) -> tuple[str, str]:
    """Select compression profile and generate human-readable reasoning.

    Returns:
        Tuple of (profile_name, reasoning_text).
    """
    reasons: list[str] = []

    if motion < 0.3:
        reasons.append("Low motion detected")
    elif motion > 0.7:
        reasons.append("High motion detected")
    else:
        reasons.append("Moderate motion detected")

    if brightness < 0.3:
        reasons.append("Dark lighting conditions")
    elif brightness > 0.7:
        reasons.append("Bright lighting conditions")
    else:
        reasons.append("Stable lighting")

    if scene_complexity < 0.3:
        reasons.append("Low scene complexity")
    elif scene_complexity > 0.7:
        reasons.append("High scene complexity")

    if noise > 0.5:
        reasons.append("Significant noise detected")
    elif noise < 0.2:
        reasons.append("Clean image quality")

    # Profile selection logic
    if compression_potential >= 0.7:
        profile = "archive_mode"
        reasons.append("Suitable for aggressive H.265 compression")
        reasons.append("Recommended: Archive Mode (maximum storage savings)")
    elif compression_potential <= 0.4:
        profile = "evidence_mode"
        reasons.append("Complex content requires quality preservation")
        reasons.append("Recommended: Evidence Mode (maximum quality retention)")
    else:
        profile = "balanced_mode"
        reasons.append("Balanced content characteristics")
        reasons.append("Recommended: Balanced Mode (optimal size-to-quality ratio)")

    reasoning = ". ".join(reasons) + "."
    return profile, reasoning


def _save_analysis_report(analysis: dict, video_id: str) -> Path:
    """Save analysis report as JSON to storage/reports/."""
    settings = get_settings()
    reports_dir = Path(settings.STORAGE_DIRECTORY) / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    output_path = reports_dir / f"{video_id}_analysis.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)

    logger.info(f"Analysis report saved: {output_path}")
    return output_path


def get_stored_analysis(video_id: str) -> Optional[dict]:
    """Load analysis from stored JSON file. Returns None if not found."""
    settings = get_settings()
    report_path = Path(settings.STORAGE_DIRECTORY) / "reports" / f"{video_id}_analysis.json"

    if not report_path.exists():
        return None

    with open(report_path, "r", encoding="utf-8") as f:
        return json.load(f)
