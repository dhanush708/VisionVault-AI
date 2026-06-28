"""Frame Difference Analyzer — Measures temporal variance across frames."""

from typing import List

import cv2
import numpy as np

from app.logger import get_logger

logger = get_logger("ai.frame_difference_analyzer")


def analyze_frame_difference(frames: List[np.ndarray]) -> float:
    """Compute frame difference variance (temporal stability indicator).

    Low variance = consistent scene, high variance = dynamic content.

    Args:
        frames: List of BGR frames.

    Returns:
        Frame difference variance score between 0.0 (stable) and 1.0 (highly variable).
    """
    if len(frames) < 2:
        return 0.0

    differences: List[float] = []

    for i in range(1, len(frames)):
        gray_prev = cv2.cvtColor(frames[i - 1], cv2.COLOR_BGR2GRAY)
        gray_curr = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(gray_prev, gray_curr)
        mean_diff = float(np.mean(diff))
        differences.append(mean_diff)

    variance = float(np.var(differences))

    # Normalize: typical variance range 0-500
    score = min(variance / 500.0, 1.0)

    logger.info(f"Frame difference variance: {score:.3f} (raw variance: {variance:.2f})")
    return round(score, 4)
