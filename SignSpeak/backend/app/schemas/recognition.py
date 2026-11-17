import math
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LandmarkPoint(BaseModel):
    x: float = Field(..., description="Normalized horizontal coordinate (typically 0.0 to 1.0).")
    y: float = Field(..., description="Normalized vertical coordinate (typically 0.0 to 1.0).")
    z: float = Field(default=0.0, description="Relative depth coordinate from wrist origin.")

    @field_validator("x", "y", "z")
    @classmethod
    def check_finite_coordinate(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("Landmark coordinates must be finite numbers.")
        return value

    @field_validator("x", "y")
    @classmethod
    def check_reasonable_bounds(cls, value: float) -> float:
        if value < -0.5 or value > 1.5:
            raise ValueError("Normalized x/y landmark coordinates must be between -0.5 and 1.5.")
        return value


class HandednessInfo(BaseModel):
    category_name: str = Field(..., alias="categoryName", examples=["Right"])
    score: float = Field(default=1.0, ge=0.0, le=1.0)

    model_config = ConfigDict(populate_by_name=True)


class LandmarkFrameInput(BaseModel):
    landmarks: List[List[LandmarkPoint]] = Field(
        ...,
        min_length=1,
        max_length=2,
        description="Array of 1 or 2 hands, each containing 21 MediaPipe landmarks.",
    )
    handedness: List[HandednessInfo] = Field(default_factory=list)
    timestamp: Optional[float] = Field(default=None)

    @field_validator("landmarks")
    @classmethod
    def validate_hand_landmark_count(
        cls, hands: List[List[LandmarkPoint]]
    ) -> List[List[LandmarkPoint]]:
        for idx, hand in enumerate(hands):
            if len(hand) != 21:
                raise ValueError(
                    f"Hand at index {idx} must contain exactly 21 landmarks, received {len(hand)}."
                )
        return hands


class RecognitionPredictRequest(LandmarkFrameInput):
    sequence: Optional[List[LandmarkFrameInput]] = Field(
        default=None,
        max_length=60,
        description="Optional rolling window of recent landmark frames for temporal dynamic gesture recognition.",
    )
    confidence_threshold: Optional[float] = Field(
        default=None,
        ge=0.3,
        le=0.99,
        description="Optional client confidence threshold override (defaults to server threshold).",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "landmarks": [
                    [{"x": 0.5, "y": 0.6, "z": -0.01} for _ in range(21)]
                ],
                "handedness": [{"categoryName": "Right", "score": 0.96}],
                "timestamp": 1731880000000,
            }
        }
    )


RecognitionStatus = Literal[
    "recognized",
    "low_confidence",
    "unsupported",
    "model_unavailable",
]


class RecognitionPredictResponse(BaseModel):
    recognized: bool = Field(
        ...,
        description="True only when a gesture meets confidence threshold.",
    )
    recognized_gesture: Optional[str] = Field(
        default=None,
        description="Canonical gesture ID if recognized, otherwise null.",
    )
    predicted_label: Optional[str] = Field(
        default=None,
        description="Human-readable label if recognized, otherwise null.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence score between 0.0 and 1.0.",
    )
    timestamp: datetime
    recognition_status: RecognitionStatus
    classifier_mode: str = Field(
        default="development_stub",
        description="Identifies whether inference ran via trained ML model or untrained stub.",
    )
    model_trained: bool = Field(
        default=False,
        description="True only when a trained gesture classification artifact is loaded.",
    )
    gesture_type: Optional[str] = Field(
        default=None,
        description="Indicates static vs dynamic sign classification.",
    )
    unknown_detected: bool = Field(default=False)
    low_confidence: bool = Field(default=False)
    isl_disclaimer: str = Field(default="")
    detail: str


class RecognitionBatchRequest(BaseModel):
    frames: List[RecognitionPredictRequest] = Field(
        ...,
        min_length=1,
        max_length=120,
        description="Ordered sequence of landmark frames for temporal gesture recognition.",
    )


class RecognitionBatchResponse(BaseModel):
    frames_processed: int
    recognized: bool
    recognized_gesture: Optional[str] = None
    predicted_label: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    timestamp: datetime
    recognition_status: RecognitionStatus
    classifier_mode: str = "development_stub"
    model_trained: bool = False
    isl_disclaimer: str = ""
    detail: str
    frame_statuses: List[RecognitionStatus]


class RecognitionStatusResponse(BaseModel):
    model_trained: bool
    recognition_status: RecognitionStatus
    classifier_mode: str
    confidence_threshold: float
    temporal_window_frames: int
    isl_disclaimer: str
    message: str
    model_metadata: Optional[Dict[str, Any]] = None
    vocabulary: List[Dict[str, Any]]
    workflow_steps: List[str]


class DatasetSampleSubmission(BaseModel):
    gesture_id: str = Field(..., description="Prototype gesture ID or 'unknown'.")
    gesture_type: Literal["static", "dynamic"] = Field(default="static")
    signer_id: str = Field(..., min_length=1, max_length=64)
    session_id: str = Field(..., min_length=1, max_length=64)
    isl_verified: bool = Field(default=False)
    notes: str = Field(default="", max_length=300)
    frames: List[LandmarkFrameInput] = Field(..., min_length=1, max_length=60)


class DatasetSampleSavedResponse(BaseModel):
    saved: bool
    sample_id: str
    gesture_id: str
    frames_saved: int
    file_path: str
    isl_disclaimer: str
