"""Motion Analyzer — Estimates motion level via frame differencing."""

from typing import List

import cv2
import numpy as np

from app.logger import get_logger

logger = get_logger("ai.motion_analyzer")


def analyze_motion(frames: List[np.ndarray]) -> float:
    """Compute motion score from consecutive frame differences.

    Args:
        frames: List of BGR frames.

    Returns:
        Motion score between 0.0 (static) and 1.0 (high motion).
    """
    if len(frames) < 2:
        return 0.0

    differences: List[float] = []

    for i in range(1, len(frames)):
        gray_prev = cv2.cvtColor(frames[i - 1], cv2.COLOR_BGR2GRAY)
        gray_curr = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(gray_prev, gray_curr)
        mean_diff = float(np.mean(diff)) / 255.0
        differences.append(mean_diff)

    score = float(np.mean(differences))
    score = min(max(score * 5.0, 0.0), 1.0)  # Scale and clamp

    logger.info(f"Motion score: {score:.3f} (from {len(differences)} frame pairs)")
    return round(score, 4)
