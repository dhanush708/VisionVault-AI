"""Frame sampling utility for video analysis."""

from pathlib import Path
from typing import List

import cv2
import numpy as np

from app.logger import get_logger

logger = get_logger("ai.frame_sampler")


def sample_frames(video_path: str, max_frames: int = 30, interval: int = 30) -> List[np.ndarray]:
    """Extract evenly-spaced sample frames from a video file.

    Args:
        video_path: Path to the video file.
        max_frames: Maximum number of frames to extract.
        interval: Frame interval for sampling (every Nth frame).

    Returns:
        List of BGR numpy arrays (frames).
    """
    path = Path(video_path)
    if not path.exists():
        logger.error(f"Video file not found: {video_path}")
        return []

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        logger.error(f"Cannot open video file: {video_path}")
        return []

    frames: List[np.ndarray] = []
    frame_count = 0

    try:
        while len(frames) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_count % interval == 0:
                frames.append(frame)
            frame_count += 1
    finally:
        cap.release()

    logger.info(f"Sampled {len(frames)} frames from {frame_count} total (interval={interval})")
    return frames
