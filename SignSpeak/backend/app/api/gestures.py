from typing import Optional

from fastapi import APIRouter, Query, status

from app.schemas.gesture import GestureDetailSchema, GestureListResponse
from app.services.gesture_service import get_gesture_by_id, list_gestures

router = APIRouter(prefix="/gestures", tags=["Gestures"])


@router.get(
    "",
    response_model=GestureListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Supported Gestures",
    description="Return the supported sign language gesture vocabulary with optional category and search filters.",
)
async def get_gestures(
    category: Optional[str] = Query(default=None, description="Filter by gesture category."),
    search: Optional[str] = Query(default=None, description="Search by label, meaning, or alias."),
) -> GestureListResponse:
    return list_gestures(category=category, search=search)


@router.get(
    "/{gesture_id}",
    response_model=GestureDetailSchema,
    status_code=status.HTTP_200_OK,
    summary="Get Gesture Details",
    description="Return detailed metadata, handshape instructions, and demonstration assets for a single gesture.",
)
async def get_gesture_detail(gesture_id: str) -> GestureDetailSchema:
    return get_gesture_by_id(gesture_id)
