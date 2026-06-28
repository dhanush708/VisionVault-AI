"""Sharpness Analyzer — Measures image sharpness via gradient magnitude."""

from typing import List

import cv2
import numpy as np

from app.logger import get_logger

logger = get_logger("ai.sharpness_analyzer")


def analyze_sharpness(frames: List[np.ndarray]) -> float:
    """Compute sharpness score via Sobel gradient magnitude.

    Args:
        frames: List of BGR frames.

    Returns:
        Sharpness score between 0.0 (blurry) and 1.0 (very sharp).
    """
    if not frames:
        return 0.0

    sharpness_values: List[float] = []

    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
        mean_gradient = float(np.mean(magnitude))
        sharpness_values.append(mean_gradient)

    avg_sharpness = float(np.mean(sharpness_values))

    # Normalize: typical range 5-80 for surveillance footage
    score = min(avg_sharpness / 80.0, 1.0)

    logger.info(f"Sharpness score: {score:.3f} (avg gradient: {avg_sharpness:.1f})")
    return round(score, 4)
