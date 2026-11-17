from datetime import datetime, timezone
from pathlib import Path

from app.core.config import Settings
from app.schemas.health import HealthResponse, SubsystemReadiness


def get_health_status(settings: Settings) -> HealthResponse:
    """Build health-check response without exposing sensitive environment values."""
    hand_task_exists = Path(settings.mediapipe_hand_landmarker_task).exists()
    classifier_exists = Path(settings.gesture_model_path).exists()

    ai_status = "initialized" if (hand_task_exists and classifier_exists) else "pending_models"
    db_status = "configured" if settings.database_configured else "unconfigured"

    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        timestamp=datetime.now(timezone.utc),
        subsystems=SubsystemReadiness(
            api="ready",
            ai_pipeline=ai_status,
            database=db_status,
        ),
    )
