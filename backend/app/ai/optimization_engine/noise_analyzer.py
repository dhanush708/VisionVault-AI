"""Noise Analyzer — Estimates noise level via Laplacian variance."""

from typing import List

import cv2
import numpy as np

from app.logger import get_logger

logger = get_logger("ai.noise_analyzer")


def analyze_noise(frames: List[np.ndarray]) -> float:
    """Compute noise score using Laplacian variance method.

    Higher variance in Laplacian indicates more detail/noise.
    Normalized to 0.0 (clean) to 1.0 (very noisy).

    Args:
        frames: List of BGR frames.

    Returns:
        Noise score between 0.0 (clean) and 1.0 (noisy).
    """
    if not frames:
        return 0.0

    variances: List[float] = []

    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = float(laplacian.var())
        variances.append(variance)

    avg_variance = float(np.mean(variances))

    # Normalize: clean images ~50-200, noisy ~500-2000+
    score = min(avg_variance / 1000.0, 1.0)

    logger.info(f"Noise score: {score:.3f} (avg Laplacian variance: {avg_variance:.1f})")
    return round(score, 4)
