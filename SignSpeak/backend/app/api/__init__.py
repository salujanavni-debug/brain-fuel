from fastapi import APIRouter

from app.api.emergency import router as emergency_router
from app.api.gestures import router as gestures_router
from app.api.health import router as health_router
from app.api.learning import router as learning_router
from app.api.recognition import router as recognition_router
from app.api.translation import router as translation_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(gestures_router)
api_router.include_router(recognition_router)
api_router.include_router(learning_router)
api_router.include_router(emergency_router)
api_router.include_router(translation_router)
