"""Deterministic landmark coordinate normalization and temporal feature engineering.

Feature format specification (FRAME_FEATURE_DIM = 130):
- Supports up to 2 hands ordered deterministically (Left slot = 0, Right slot = 1 when
  handedness is available; otherwise input slot order).
- For each hand (21 landmarks x 3 coordinates = 63 floats):
  1. Translation normalization: subtract wrist coordinate (landmark index 0).
  2. Scale normalization: divide by max(middle_mcp_distance, max_wrist_radius, eps)
     so predictions are invariant to camera distance and hand size.
- Appends 2 hand-presence flags [has_hand_0, has_hand_1] and 2 handedness flags
  [is_right_0, is_right_1] -> 63 + 63 + 2 + 2 = 130 features per frame.

Temporal sequence format (SEQUENCE_LENGTH = 24 frames):
- Pads or resamples a landmark sequence to T = 24 frames.
- Extracts temporal summary statistics (mean, std, first-to-last delta, mean frame-to-frame
  absolute velocity) across all 130 features -> 520 sequence summary features for scikit-learn,
  or raw (T, 260) [frame + velocity] tensor for TensorFlow LSTM/1D-CNN models.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Tuple

NUM_HANDS = 2
LANDMARKS_PER_HAND = 21
COORDS_PER_LANDMARK = 3
HAND_FEATURE_DIM = LANDMARKS_PER_HAND * COORDS_PER_LANDMARK  # 63
FRAME_FEATURE_DIM = HAND_FEATURE_DIM * NUM_HANDS + 4  # 130
DEFAULT_SEQUENCE_LENGTH = 24
SEQUENCE_SUMMARY_DIM = FRAME_FEATURE_DIM * 4  # mean, std, net_delta, mean_abs_vel = 520

_EPS = 1e-6


def _extract_xyz(point: Any) -> Tuple[float, float, float]:
    if isinstance(point, Mapping):
        return float(point["x"]), float(point["y"]), float(point.get("z", 0.0))
    return float(point.x), float(point.y), float(getattr(point, "z", 0.0))


def _extract_handedness_name(entry: Any) -> str:
    if isinstance(entry, Mapping):
        return str(entry.get("categoryName") or entry.get("category_name") or "").strip()
    return str(getattr(entry, "category_name", "") or getattr(entry, "categoryName", "")).strip()


def normalize_hand_landmarks(hand: Sequence[Any]) -> List[float]:
    """Center a single 21-landmark hand on its wrist (index 0) and scale by hand size.

    Returns 63 normalized coordinates [x0, y0, z0, ..., x20, y20, z20].
    """
    if len(hand) != LANDMARKS_PER_HAND:
        raise ValueError(
            f"Expected exactly {LANDMARKS_PER_HAND} landmarks per hand, received {len(hand)}."
        )

    pts = [_extract_xyz(p) for p in hand]
    wx, wy, wz = pts[0]

    centered: List[Tuple[float, float, float]] = [
        (px - wx, py - wy, pz - wz) for (px, py, pz) in pts
    ]

    # Use palm size (wrist -> middle finger MCP at index 9) and max landmark radius for scale stability
    mx, my, mz = centered[9]
    palm_dist = math.sqrt(mx * mx + my * my + mz * mz)
    max_radius = max(math.sqrt(cx * cx + cy * cy + cz * cz) for (cx, cy, cz) in centered)
    scale = max(palm_dist, max_radius, _EPS)

    flat: List[float] = []
    for cx, cy, cz in centered:
        flat.extend((cx / scale, cy / scale, cz / scale))
    return flat


def extract_frame_features(
    hands: Sequence[Sequence[Any]],
    handedness: Sequence[Any] | None = None,
) -> List[float]:
    """Convert 1 or 2 hands of 21 landmarks into a deterministic 130-dim feature vector."""
    if not hands or len(hands) > NUM_HANDS:
        raise ValueError(f"Expected 1 to {NUM_HANDS} hands per frame, received {len(hands)}.")

    slots: List[List[float] | None] = [None, None]
    presence = [0.0, 0.0]
    is_right = [0.0, 0.0]

    handed_names = [_extract_handedness_name(h) for h in (handedness or [])]

    for idx, hand in enumerate(hands):
        norm_coords = normalize_hand_landmarks(hand)
        label = handed_names[idx].lower() if idx < len(handed_names) else ""

        if label == "left" and slots[0] is None:
            slot = 0
        elif label == "right" and slots[1] is None:
            slot = 1
        else:
            slot = 0 if slots[0] is None else 1

        slots[slot] = norm_coords
        presence[slot] = 1.0
        is_right[slot] = 1.0 if label == "right" else 0.0

    features: List[float] = []
    for slot_idx in range(NUM_HANDS):
        if slots[slot_idx] is not None:
            features.extend(slots[slot_idx])  # type: ignore[arg-type]
        else:
            features.extend([0.0] * HAND_FEATURE_DIM)

    features.extend(presence)
    features.extend(is_right)
    return features


def resample_sequence(
    frame_vectors: Sequence[Sequence[float]],
    target_length: int = DEFAULT_SEQUENCE_LENGTH,
) -> List[List[float]]:
    """Uniformly resample or pad a sequence of frame vectors to fixed target_length."""
    if not frame_vectors:
        raise ValueError("Cannot resample an empty landmark sequence.")

    n = len(frame_vectors)
    if n == 1:
        single = list(frame_vectors[0])
        return [list(single) for _ in range(target_length)]

    if n == target_length:
        return [list(vec) for vec in frame_vectors]

    resampled: List[List[float]] = []
    for step in range(target_length):
        pos = step * (n - 1) / max(1, target_length - 1)
        idx = min(n - 1, max(0, round(pos)))
        resampled.append(list(frame_vectors[idx]))
    return resampled


def extract_sequence_tensor_rows(
    frame_vectors: Sequence[Sequence[float]],
    target_length: int = DEFAULT_SEQUENCE_LENGTH,
) -> List[List[float]]:
    """Build (T, 260) rows concatenating normalized pose [130] + frame velocity [130]."""
    seq = resample_sequence(frame_vectors, target_length=target_length)
    rows: List[List[float]] = []
    for t, vec in enumerate(seq):
        if t == 0:
            vel = [0.0] * len(vec)
        else:
            prev = seq[t - 1]
            vel = [vec[i] - prev[i] for i in range(len(vec))]
        rows.append(list(vec) + vel)
    return rows


def extract_sequence_summary_features(
    frame_vectors: Sequence[Sequence[float]],
    target_length: int = DEFAULT_SEQUENCE_LENGTH,
) -> List[float]:
    """Summarize temporal landmark motion into a 520-dim vector [mean, std, net_delta, mean_abs_vel]."""
    seq = resample_sequence(frame_vectors, target_length=target_length)
    t_count = len(seq)
    dim = len(seq[0])

    means = [0.0] * dim
    for vec in seq:
        for d in range(dim):
            means[d] += vec[d]
    means = [val / t_count for val in means]

    stds = [0.0] * dim
    for vec in seq:
        for d in range(dim):
            diff = vec[d] - means[d]
            stds[d] += diff * diff
    stds = [math.sqrt(val / t_count) for val in stds]

    first_vec = seq[0]
    last_vec = seq[-1]
    net_delta = [last_vec[d] - first_vec[d] for d in range(dim)]

    mean_abs_vel = [0.0] * dim
    if t_count > 1:
        for t in range(1, t_count):
            cur = seq[t]
            prev = seq[t - 1]
            for d in range(dim):
                mean_abs_vel[d] += abs(cur[d] - prev[d])
        mean_abs_vel = [val / (t_count - 1) for val in mean_abs_vel]

    return means + stds + net_delta + mean_abs_vel
