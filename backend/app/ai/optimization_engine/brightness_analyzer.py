"""Brightness Analyzer — Computes luminance statistics."""

from typing import List

import cv2
import numpy as np

from app.logger import get_logger

logger = get_logger("ai.brightness_analyzer")


def analyze_brightness(frames: List[np.ndarray]) -> float:
    """Compute normalized brightness score from frame luminance.

    Args:
        frames: List of BGR frames.

    Returns:
        Brightness score between 0.0 (very dark) and 1.0 (very bright).
    """
    if not frames:
        return 0.5

    luminances: List[float] = []

    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_luminance = float(np.mean(gray))
        luminances.append(mean_luminance)

    avg_luminance = float(np.mean(luminances))
    score = avg_luminance / 255.0

    logger.info(f"Brightness score: {score:.3f} (avg luminance: {avg_luminance:.1f})")
    return round(score, 4)
