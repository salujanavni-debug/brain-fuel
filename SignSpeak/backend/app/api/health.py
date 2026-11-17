from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.health import HealthResponse
from app.services.health_service import get_health_status

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Backend Health Check")
async def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Verify FastAPI service availability and subsystem configuration."""
    return get_health_status(settings)
