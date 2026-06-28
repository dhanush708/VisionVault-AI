"""Edge Density Analyzer — Measures visual complexity via Canny edge detection."""

from typing import List

import cv2
import numpy as np

from app.logger import get_logger

logger = get_logger("ai.edge_density_analyzer")


def analyze_edge_density(frames: List[np.ndarray]) -> float:
    """Compute edge density score using Canny edge detection.

    Args:
        frames: List of BGR frames.

    Returns:
        Edge density score between 0.0 (smooth) and 1.0 (highly detailed).
    """
    if not frames:
        return 0.0

    densities: List[float] = []

    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        density = float(np.count_nonzero(edges)) / float(edges.size)
        densities.append(density)

    avg_density = float(np.mean(densities))

    # Typical surveillance footage: 0.02-0.15 edge density
    score = min(avg_density / 0.15, 1.0)

    logger.info(f"Edge density score: {score:.3f} (avg density: {avg_density:.4f})")
    return round(score, 4)
