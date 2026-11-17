"""Trained gesture classifier loader with threshold, margin, and temporal sequence inference."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.ml.features import (
    DEFAULT_SEQUENCE_LENGTH,
    extract_frame_features,
    extract_sequence_summary_features,
    extract_sequence_tensor_rows,
)
from app.ml.vocabulary import (
    ISL_PROTOTYPE_DISCLAIMER,
    LABEL_BY_ID,
    TYPE_BY_ID,
    UNKNOWN_CLASS_ID,
)

logger = logging.getLogger("signspeak.ml.inference")


class TrainedLandmarkClassifier:
    """Loads a verified trained scikit-learn or TensorFlow gesture model artifact."""

    def __init__(self, artifact_path: Path, metadata_path: Path) -> None:
        self.artifact_path = artifact_path
        self.metadata_path = metadata_path
        self.metadata: Dict[str, Any] = json.loads(metadata_path.read_text(encoding="utf-8"))
        self.framework: str = str(self.metadata.get("framework", "sklearn"))
        self.classes: List[str] = list(self.metadata.get("classes", []))
        self.label_map: Dict[str, str] = dict(self.metadata.get("label_map", {}))
        self.sequence_length: int = int(
            self.metadata.get("feature_format", {}).get("sequence_length", DEFAULT_SEQUENCE_LENGTH)
        )
        self.mode = f"trained_{self.framework}"
        self._model = self._load_model()

    def _load_model(self) -> Any:
        if self.framework == "tensorflow":
            import tensorflow as tf  # type: ignore

            return tf.keras.models.load_model(self.artifact_path)
        import joblib

        return joblib.load(self.artifact_path)

    def _build_sequence_vectors(self, frames_payload: List[Dict[str, Any]]) -> List[List[float]]:
        vectors: List[List[float]] = []
        for frame in frames_payload:
            hands = frame.get("landmarks", [])
            handedness = frame.get("handedness", [])
            if hands:
                vectors.append(extract_frame_features(hands, handedness))
        return vectors

    def predict_probabilities(
        self, frames_payload: List[Dict[str, Any]]
    ) -> List[Tuple[str, float]]:
        vectors = self._build_sequence_vectors(frames_payload)
        if not vectors:
            return []

        import numpy as np

        if self.framework == "tensorflow":
            tensor_rows = extract_sequence_tensor_rows(
                vectors, target_length=self.sequence_length
            )
            batch = np.asarray([tensor_rows], dtype=np.float32)
            probs = self._model.predict(batch, verbose=0)[0]
            class_names = self.classes
        else:
            summary_row = extract_sequence_summary_features(
                vectors, target_length=self.sequence_length
            )
            batch = np.asarray([summary_row], dtype=np.float32)
            probs = self._model.predict_proba(batch)[0]
            class_names = list(self._model.classes_)

        ranked = sorted(
            ((str(cls_id), float(prob)) for cls_id, prob in zip(class_names, probs)),
            key=lambda pair: pair[1],
            reverse=True,
        )
        return ranked

    def evaluate_prediction(
        self,
        frames_payload: List[Dict[str, Any]],
        min_confidence: float = 0.70,
        min_margin: float = 0.12,
    ) -> Dict[str, Any]:
        ranked = self.predict_probabilities(frames_payload)
        now = datetime.now(timezone.utc)
        if not ranked:
            return {
                "recognized": False,
                "recognized_gesture": None,
                "predicted_label": None,
                "confidence": 0.0,
                "timestamp": now,
                "recognition_status": "unsupported",
                "classifier_mode": self.mode,
                "model_trained": True,
                "gesture_type": None,
                "unknown_detected": True,
                "low_confidence": False,
                "isl_disclaimer": ISL_PROTOTYPE_DISCLAIMER,
                "detail": "No valid hand landmark coordinates were available for inference.",
            }

        top_id, top_prob = ranked[0]
        second_prob = ranked[1][1] if len(ranked) > 1 else 0.0
        margin = top_prob - second_prob
        top_label = self.label_map.get(top_id, LABEL_BY_ID.get(top_id, top_id.title()))
        gesture_type = TYPE_BY_ID.get(top_id, "dynamic" if len(frames_payload) > 1 else "static")

        if top_id == UNKNOWN_CLASS_ID:
            return {
                "recognized": False,
                "recognized_gesture": None,
                "predicted_label": None,
                "confidence": round(top_prob, 4),
                "timestamp": now,
                "recognition_status": "unsupported",
                "classifier_mode": self.mode,
                "model_trained": True,
                "gesture_type": None,
                "unknown_detected": True,
                "low_confidence": False,
                "isl_disclaimer": ISL_PROTOTYPE_DISCLAIMER,
                "detail": "Unknown or neutral hand pose detected — no vocabulary sign matched.",
            }

        if top_prob < min_confidence or margin < min_margin:
            return {
                "recognized": False,
                "recognized_gesture": None,
                "predicted_label": None,
                "confidence": round(top_prob, 4),
                "timestamp": now,
                "recognition_status": "low_confidence",
                "classifier_mode": self.mode,
                "model_trained": True,
                "gesture_type": gesture_type,
                "unknown_detected": margin < min_margin,
                "low_confidence": True,
                "isl_disclaimer": ISL_PROTOTYPE_DISCLAIMER,
                "detail": (
                    f"Low confidence ({top_prob * 100:.1f}%, margin {margin * 100:.1f}%): "
                    "hold the sign clearly in good lighting or use Quick Messages."
                ),
            }

        if gesture_type == "dynamic" and len(frames_payload) < 4:
            return {
                "recognized": False,
                "recognized_gesture": None,
                "predicted_label": None,
                "confidence": round(top_prob, 4),
                "timestamp": now,
                "recognition_status": "low_confidence",
                "classifier_mode": self.mode,
                "model_trained": True,
                "gesture_type": "dynamic",
                "unknown_detected": False,
                "low_confidence": True,
                "isl_disclaimer": ISL_PROTOTYPE_DISCLAIMER,
                "detail": (
                    f"Dynamic sign '{top_label}' requires a temporal sequence of frames; "
                    f"received only {len(frames_payload)} frame(s)."
                ),
            }

        return {
            "recognized": True,
            "recognized_gesture": top_id,
            "predicted_label": top_label,
            "confidence": round(top_prob, 4),
            "timestamp": now,
            "recognition_status": "recognized",
            "classifier_mode": self.mode,
            "model_trained": True,
            "gesture_type": gesture_type,
            "unknown_detected": False,
            "low_confidence": False,
            "isl_disclaimer": ISL_PROTOTYPE_DISCLAIMER,
            "detail": f"Recognized prototype gesture '{top_label}' ({top_prob * 100:.1f}% confidence).",
        }


def resolve_trained_classifier(models_dir: Path) -> Optional[TrainedLandmarkClassifier]:
    """Return a loaded TrainedLandmarkClassifier only if both artifact & metadata exist."""
    metadata_path = models_dir / "model_metadata.json"
    if not metadata_path.exists():
        return None

    for filename in (
        "signspeak_gesture_classifier.joblib",
        "signspeak_gesture_classifier.keras",
    ):
        candidate = models_dir / filename
        if candidate.exists():
            try:
                return TrainedLandmarkClassifier(candidate, metadata_path)
            except Exception as exc:
                logger.warning("Failed to load trained classifier '%s': %s", candidate, exc)
                return None

    return None
