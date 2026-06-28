"""Entropy Analyzer — Measures information content per frame."""

from typing import List

import cv2
import numpy as np

from app.logger import get_logger

logger = get_logger("ai.entropy_analyzer")


def analyze_entropy(frames: List[np.ndarray]) -> float:
    """Compute average Shannon entropy of grayscale frames.

    Higher entropy = more information content = harder to compress.

    Args:
        frames: List of BGR frames.

    Returns:
        Entropy score between 0.0 (low information) and 1.0 (high information).
    """
    if not frames:
        return 0.0

    entropies: List[float] = []

    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist.flatten()
        total_pixels = gray.size
        probabilities = hist[hist > 0] / total_pixels
        entropy = -float(np.sum(probabilities * np.log2(probabilities)))
        entropies.append(entropy)

    avg_entropy = float(np.mean(entropies))

    # Max possible entropy for 8-bit grayscale = 8.0
    score = avg_entropy / 8.0

    logger.info(f"Entropy score: {score:.3f} (avg entropy: {avg_entropy:.2f} bits)")
    return round(score, 4)
