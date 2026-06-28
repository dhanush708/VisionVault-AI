"""Scene Complexity Analyzer — Measures scene variation via histogram comparison."""

from typing import List

import cv2
import numpy as np

from app.logger import get_logger

logger = get_logger("ai.scene_complexity_analyzer")


def analyze_scene_complexity(frames: List[np.ndarray]) -> float:
    """Compute scene complexity via histogram correlation between consecutive frames.

    High variation between frames = high complexity.

    Args:
        frames: List of BGR frames.

    Returns:
        Scene complexity score between 0.0 (uniform) and 1.0 (highly complex).
    """
    if len(frames) < 2:
        return 0.0

    correlations: List[float] = []

    for i in range(1, len(frames)):
        hist_prev = cv2.calcHist([frames[i - 1]], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        hist_curr = cv2.calcHist([frames[i]], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])

        cv2.normalize(hist_prev, hist_prev)
        cv2.normalize(hist_curr, hist_curr)

        correlation = cv2.compareHist(hist_prev, hist_curr, cv2.HISTCMP_CORREL)
        correlations.append(correlation)

    avg_correlation = float(np.mean(correlations))

    # Invert: high correlation = low complexity, low correlation = high complexity
    score = 1.0 - max(avg_correlation, 0.0)

    logger.info(f"Scene complexity score: {score:.3f} (avg correlation: {avg_correlation:.3f})")
    return round(score, 4)
