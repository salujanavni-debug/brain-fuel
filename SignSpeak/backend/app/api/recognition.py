from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.schemas.recognition import (
    DatasetSampleSavedResponse,
    DatasetSampleSubmission,
    RecognitionBatchRequest,
    RecognitionBatchResponse,
    RecognitionPredictRequest,
    RecognitionPredictResponse,
    RecognitionStatusResponse,
)
from app.services.recognition_service import (
    get_recognition_status,
    predict_frame_batch,
    predict_single_frame,
    save_dataset_sample,
)

router = APIRouter(prefix="/recognition", tags=["Recognition"])


@router.get(
    "/status",
    response_model=RecognitionStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Inspect Gesture Recognition Model Readiness & Vocabulary",
    description=(
        "Reports whether a trained gesture model artifact is loaded, exposes the initial "
        "prototype vocabulary with ISL verification disclaimer, and provides the dataset "
        "collection workflow when untrained."
    ),
)
async def recognition_status(
    settings: Settings = Depends(get_settings),
) -> RecognitionStatusResponse:
    return get_recognition_status(settings)


@router.post(
    "/predict",
    response_model=RecognitionPredictResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Gesture from Hand Landmarks",
    description=(
        "Validate 21-point MediaPipe hand landmark coordinates (single frame or temporal sequence) "
        "and run trained gesture classification with confidence threshold and unknown-pose rejection. "
        "When no trained model exists, explicitly reports model_unavailable rather than fabricating predictions."
    ),
)
async def predict_gesture(
    payload: RecognitionPredictRequest,
    settings: Settings = Depends(get_settings),
) -> RecognitionPredictResponse:
    return predict_single_frame(payload, settings)


@router.post(
    "/batch",
    response_model=RecognitionBatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Gesture from Landmark Sequence Batch",
    description=(
        "Process an ordered sequence of landmark frames for temporal dynamic sign recognition. "
        "Validates every frame and returns explicit model readiness or confidence status."
    ),
)
async def predict_gesture_batch(
    payload: RecognitionBatchRequest,
    settings: Settings = Depends(get_settings),
) -> RecognitionBatchResponse:
    return predict_frame_batch(payload, settings)


@router.post(
    "/dataset/samples",
    response_model=DatasetSampleSavedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save Annotated Hand-Landmark Sample for Training",
    description=(
        "Validates and stores labeled MediaPipe hand-landmark clips into datasets/raw/ for "
        "subsequent model training with app.ml.train_classifier."
    ),
)
async def submit_dataset_sample(
    payload: DatasetSampleSubmission,
    settings: Settings = Depends(get_settings),
) -> DatasetSampleSavedResponse:
    try:
        return save_dataset_sample(payload, settings)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
