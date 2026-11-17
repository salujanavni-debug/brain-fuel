import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.core.config import Settings
from app.ml.dataset import get_collection_workflow_guide, parse_sample_record
from app.ml.features import DEFAULT_SEQUENCE_LENGTH, extract_frame_features
from app.ml.inference import TrainedLandmarkClassifier, resolve_trained_classifier
from app.ml.vocabulary import INITIAL_PROTOTYPE_VOCABULARY, ISL_PROTOTYPE_DISCLAIMER
from app.schemas.recognition import (
    DatasetSampleSavedResponse,
    DatasetSampleSubmission,
    RecognitionBatchRequest,
    RecognitionBatchResponse,
    RecognitionPredictRequest,
    RecognitionPredictResponse,
    RecognitionStatusResponse,
)

logger = logging.getLogger("signspeak.recognition")


class UntrainedModelPlaceholder:
    """Explicit untrained model state returned when no trained gesture artifact exists.

    Never fabricates predictions or accuracy metrics. Directs callers to the
    authentic ISL dataset collection & training workflow.
    """

    mode = "development_stub"

    def predict_frame(
        self, payload: RecognitionPredictRequest, min_confidence: float
    ) -> RecognitionPredictResponse:
        hands_count = len(payload.landmarks)
        # Validate normalization deterministically so landmark format is verified end-to-end
        extract_frame_features(payload.landmarks, payload.handedness)
        logger.info(
            "Model not trained yet; validated %s hand(s) (threshold=%.2f) and returning model_unavailable.",
            hands_count,
            min_confidence,
        )
        return RecognitionPredictResponse(
            recognized=False,
            recognized_gesture=None,
            predicted_label=None,
            confidence=0.0,
            timestamp=datetime.now(timezone.utc),
            recognition_status="model_unavailable",
            classifier_mode=self.mode,
            model_trained=False,
            gesture_type="dynamic" if payload.sequence and len(payload.sequence) > 1 else "static",
            unknown_detected=False,
            low_confidence=False,
            isl_disclaimer=ISL_PROTOTYPE_DISCLAIMER,
            detail=(
                "Gesture classification model is not trained yet (no authentic labeled ISL "
                "training dataset loaded). Incoming 21-point hand landmarks were validated and "
                "normalized cleanly. Collect labeled samples via the Dataset Collection workflow "
                "and run app.ml.train_classifier to enable predictions."
            ),
        )


def _resolve_models_dir(settings: Settings) -> Path:
    return Path(settings.gesture_model_path).parent


def get_active_classifier(
    settings: Settings,
) -> TrainedLandmarkClassifier | UntrainedModelPlaceholder:
    models_dir = _resolve_models_dir(settings)
    trained = resolve_trained_classifier(models_dir)
    if trained is not None:
        return trained
    logger.debug("No trained gesture artifact under '%s'; model is not trained yet.", models_dir)
    return UntrainedModelPlaceholder()


def get_recognition_status(settings: Settings) -> RecognitionStatusResponse:
    classifier = get_active_classifier(settings)
    guide = get_collection_workflow_guide()

    if isinstance(classifier, TrainedLandmarkClassifier):
        return RecognitionStatusResponse(
            model_trained=True,
            recognition_status="recognized",
            classifier_mode=classifier.mode,
            confidence_threshold=settings.min_confidence_threshold,
            temporal_window_frames=classifier.sequence_length,
            isl_disclaimer=ISL_PROTOTYPE_DISCLAIMER,
            message=(
                f"Trained {classifier.framework} gesture classifier loaded "
                f"({len(classifier.classes)} classes)."
            ),
            model_metadata=classifier.metadata,
            vocabulary=INITIAL_PROTOTYPE_VOCABULARY,
            workflow_steps=guide["steps"],
        )

    return RecognitionStatusResponse(
        model_trained=False,
        recognition_status="model_unavailable",
        classifier_mode=classifier.mode,
        confidence_threshold=settings.min_confidence_threshold,
        temporal_window_frames=DEFAULT_SEQUENCE_LENGTH,
        isl_disclaimer=ISL_PROTOTYPE_DISCLAIMER,
        message=(
            "Gesture classification model is not trained yet. Suitable authentic ISL training "
            "data has not been collected and trained into a saved model artifact."
        ),
        model_metadata=None,
        vocabulary=INITIAL_PROTOTYPE_VOCABULARY,
        workflow_steps=guide["steps"],
    )


def _payload_to_frame_dicts(payload: RecognitionPredictRequest) -> List[Dict[str, Any]]:
    if payload.sequence and len(payload.sequence) > 0:
        frames = payload.sequence
    else:
        frames = [payload]

    return [
        {
            "landmarks": [
                [{"x": pt.x, "y": pt.y, "z": pt.z} for pt in hand]
                for hand in frame.landmarks
            ],
            "handedness": [
                {"categoryName": h.category_name, "score": h.score}
                for h in frame.handedness
            ],
        }
        for frame in frames
    ]


def predict_single_frame(
    payload: RecognitionPredictRequest, settings: Settings
) -> RecognitionPredictResponse:
    classifier = get_active_classifier(settings)
    threshold = (
        payload.confidence_threshold
        if payload.confidence_threshold is not None
        else settings.min_confidence_threshold
    )

    if isinstance(classifier, TrainedLandmarkClassifier):
        frame_dicts = _payload_to_frame_dicts(payload)
        res = classifier.evaluate_prediction(frame_dicts, min_confidence=threshold)
        return RecognitionPredictResponse(**res)

    return classifier.predict_frame(payload, threshold)


def predict_frame_batch(
    payload: RecognitionBatchRequest, settings: Settings
) -> RecognitionBatchResponse:
    classifier = get_active_classifier(settings)
    if isinstance(classifier, TrainedLandmarkClassifier):
        sequence_dicts = [
            {
                "landmarks": [
                    [{"x": pt.x, "y": pt.y, "z": pt.z} for pt in hand]
                    for hand in frame.landmarks
                ],
                "handedness": [
                    {"categoryName": h.category_name, "score": h.score}
                    for h in frame.handedness
                ],
            }
            for frame in payload.frames
        ]
        res = classifier.evaluate_prediction(
            sequence_dicts, min_confidence=settings.min_confidence_threshold
        )
        status_val = res["recognition_status"]
        return RecognitionBatchResponse(
            frames_processed=len(payload.frames),
            recognized=res["recognized"],
            recognized_gesture=res["recognized_gesture"],
            predicted_label=res["predicted_label"],
            confidence=res["confidence"],
            timestamp=res["timestamp"],
            recognition_status=status_val,
            classifier_mode=classifier.mode,
            model_trained=True,
            isl_disclaimer=ISL_PROTOTYPE_DISCLAIMER,
            detail=res["detail"],
            frame_statuses=[status_val for _ in payload.frames],
        )

    frame_results = [
        classifier.predict_frame(frame, settings.min_confidence_threshold)
        for frame in payload.frames
    ]
    last_result = frame_results[-1]
    return RecognitionBatchResponse(
        frames_processed=len(frame_results),
        recognized=False,
        recognized_gesture=None,
        predicted_label=None,
        confidence=0.0,
        timestamp=datetime.now(timezone.utc),
        recognition_status=last_result.recognition_status,
        classifier_mode=classifier.mode,
        model_trained=False,
        isl_disclaimer=ISL_PROTOTYPE_DISCLAIMER,
        detail=last_result.detail,
        frame_statuses=[res.recognition_status for res in frame_results],
    )


def save_dataset_sample(
    submission: DatasetSampleSubmission, settings: Settings
) -> DatasetSampleSavedResponse:
    sample_id = f"{submission.gesture_id}_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}_{uuid4().hex[:6]}"
    raw_record = {
        "sample_id": sample_id,
        "gesture_id": submission.gesture_id,
        "gesture_type": submission.gesture_type,
        "signer_id": submission.signer_id,
        "session_id": submission.session_id,
        "isl_verified": submission.isl_verified,
        "notes": submission.notes,
        "frames": [
            {
                "landmarks": [
                    [{"x": pt.x, "y": pt.y, "z": pt.z} for pt in hand]
                    for hand in frame.landmarks
                ],
                "handedness": [
                    {"categoryName": h.category_name, "score": h.score}
                    for h in frame.handedness
                ],
                "timestamp": frame.timestamp,
            }
            for frame in submission.frames
        ],
    }

    parsed = parse_sample_record(raw_record, index=0)

    datasets_dir = _resolve_models_dir(settings).parent / "datasets" / "raw"
    datasets_dir.mkdir(parents=True, exist_ok=True)
    target_file = datasets_dir / f"{parsed.gesture_id}_collected.json"

    existing: Dict[str, Any] = {"samples": []}
    if target_file.exists():
        try:
            loaded = json.loads(target_file.read_text(encoding="utf-8"))
            if isinstance(loaded, dict) and isinstance(loaded.get("samples"), list):
                existing = loaded
        except Exception:
            existing = {"samples": []}

    existing["samples"].append(raw_record)
    target_file.write_text(json.dumps(existing, indent=2), encoding="utf-8")

    return DatasetSampleSavedResponse(
        saved=True,
        sample_id=sample_id,
        gesture_id=parsed.gesture_id,
        frames_saved=len(parsed.frames),
        file_path=str(target_file),
        isl_disclaimer=ISL_PROTOTYPE_DISCLAIMER,
    )
