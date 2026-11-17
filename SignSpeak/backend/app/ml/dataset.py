"""Dataset validation, annotation schema loading, and collection workflow helpers."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from app.ml.features import (
    DEFAULT_SEQUENCE_LENGTH,
    extract_frame_features,
    extract_sequence_summary_features,
    extract_sequence_tensor_rows,
)
from app.ml.vocabulary import (
    ID_BY_LABEL,
    INITIAL_PROTOTYPE_VOCABULARY,
    LABEL_BY_ID,
    UNKNOWN_CLASS_ID,
)

SUPPORTED_CLASS_IDS = set(LABEL_BY_ID.keys()) | {UNKNOWN_CLASS_ID}


class DatasetUnavailableError(RuntimeError):
    """Raised when no valid labeled landmark dataset is available for training."""


@dataclass
class LabeledGestureSample:
    sample_id: str
    gesture_id: str
    label: str
    gesture_type: str  # "static" or "dynamic"
    session_id: str
    signer_id: str
    isl_verified: bool
    frames: List[List[float]]  # list of 130-dim normalized frame feature vectors


def normalize_gesture_id(raw_label: str) -> Optional[str]:
    cleaned = str(raw_label or "").strip().lower()
    if cleaned in SUPPORTED_CLASS_IDS:
        return cleaned
    return ID_BY_LABEL.get(cleaned)


def parse_sample_record(record: Dict[str, Any], index: int = 0) -> LabeledGestureSample:
    """Validate and convert a raw JSON sample record into normalized landmark features."""
    raw_label = record.get("gesture_id") or record.get("label") or ""
    gesture_id = normalize_gesture_id(str(raw_label))
    if not gesture_id:
        raise ValueError(
            f"Sample {index}: unsupported gesture label '{raw_label}'. "
            f"Allowed IDs: {sorted(SUPPORTED_CLASS_IDS)}."
        )

    raw_frames = record.get("frames")
    if not raw_frames and record.get("landmarks"):
        raw_frames = [
            {
                "landmarks": record["landmarks"],
                "handedness": record.get("handedness", []),
            }
        ]

    if not isinstance(raw_frames, list) or len(raw_frames) == 0:
        raise ValueError(f"Sample {index}: must contain at least one landmark frame.")

    frame_vectors: List[List[float]] = []
    for frame in raw_frames:
        hands = frame.get("landmarks") if isinstance(frame, dict) else frame
        handedness = frame.get("handedness", []) if isinstance(frame, dict) else []
        if not hands:
            continue
        frame_vectors.append(extract_frame_features(hands, handedness))

    if not frame_vectors:
        raise ValueError(f"Sample {index}: no valid hand landmark frames found.")

    gesture_type = str(record.get("gesture_type") or ("dynamic" if len(frame_vectors) > 1 else "static"))
    if gesture_type not in {"static", "dynamic"}:
        gesture_type = "dynamic" if len(frame_vectors) > 1 else "static"

    session_id = str(record.get("session_id") or f"session_{index}")
    signer_id = str(record.get("signer_id") or session_id)

    return LabeledGestureSample(
        sample_id=str(record.get("sample_id") or f"sample_{index}"),
        gesture_id=gesture_id,
        label=LABEL_BY_ID.get(gesture_id, "Unknown"),
        gesture_type=gesture_type,
        session_id=session_id,
        signer_id=signer_id,
        isl_verified=bool(record.get("isl_verified", False)),
        frames=frame_vectors,
    )


def load_dataset_directory(dataset_path: Path) -> List[LabeledGestureSample]:
    """Load validated landmark samples from a JSON file or directory of JSON files."""
    if not dataset_path.exists():
        raise DatasetUnavailableError(
            f"Model cannot be trained yet: dataset path '{dataset_path}' does not exist. "
            "Record real MediaPipe hand landmark samples via SignSpeak's Dataset Collection "
            "workflow first."
        )

    json_files: List[Path]
    if dataset_path.is_file():
        json_files = [dataset_path]
    else:
        json_files = sorted(
            p for p in dataset_path.rglob("*.json") if p.is_file()
        )

    if not json_files:
        raise DatasetUnavailableError(
            f"Model cannot be trained yet: no labeled JSON dataset files found under '{dataset_path}'. "
            "Collect and annotate authentic ISL gesture samples before training."
        )

    samples: List[LabeledGestureSample] = []
    for file_path in json_files:
        raw_content = json.loads(file_path.read_text(encoding="utf-8"))
        records = raw_content.get("samples", []) if isinstance(raw_content, dict) else raw_content
        if not isinstance(records, list):
            raise ValueError(f"Dataset file '{file_path}' must contain a JSON array or {{\"samples\": [...]}}.")
        for idx, rec in enumerate(records):
            samples.append(parse_sample_record(rec, index=len(samples) + idx))

    if not samples:
        raise DatasetUnavailableError(
            f"Model cannot be trained yet: '{dataset_path}' contains zero valid labeled samples."
        )

    return samples


def build_feature_matrices(
    samples: Sequence[LabeledGestureSample],
    mode: str = "temporal_summary",
    sequence_length: int = DEFAULT_SEQUENCE_LENGTH,
) -> Tuple[List[Any], List[str], List[str]]:
    """Convert validated samples into feature rows X, class labels y, and group IDs."""
    x_rows: List[Any] = []
    y_labels: List[str] = []
    groups: List[str] = []

    for sample in samples:
        if mode == "single_frame":
            # Static frame feature vector from middle frame of clip
            mid = len(sample.frames) // 2
            x_rows.append(sample.frames[mid])
        elif mode == "temporal_tensor":
            x_rows.append(extract_sequence_tensor_rows(sample.frames, target_length=sequence_length))
        else:
            x_rows.append(extract_sequence_summary_features(sample.frames, target_length=sequence_length))
        y_labels.append(sample.gesture_id)
        groups.append(sample.signer_id or sample.session_id)

    return x_rows, y_labels, groups


def get_collection_workflow_guide() -> Dict[str, Any]:
    """Return structured instructions and schema for authentic ISL dataset collection."""
    return {
        "model_trained": False,
        "isl_disclaimer": (
            "Prototype labels require validation against authentic Indian Sign Language (ISL) "
            "references with qualified ISL reviewers."
        ),
        "recommended_minimum_samples_per_class": 25,
        "recommended_distinct_signers": 3,
        "steps": [
            "1. Open the Translator page and enable Dataset Collection mode with your webcam running.",
            "2. Select a prototype label (or Unknown/Neutral) and capture static poses or 24-frame dynamic motion clips.",
            "3. Record across multiple signers, lighting conditions, camera distances, and verify against authentic ISL references.",
            "4. Export the annotated JSON dataset into SignSpeak/backend/datasets/raw/ (or save via POST /api/recognition/dataset/samples).",
            "5. Run: python -m app.ml.train_classifier --dataset ./datasets/raw --output-dir ./models",
        ],
        "vocabulary": INITIAL_PROTOTYPE_VOCABULARY,
    }
