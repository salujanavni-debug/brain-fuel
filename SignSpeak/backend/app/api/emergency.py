from fastapi import APIRouter, status

from app.schemas.emergency import EmergencyMessagesResponse
from app.services.emergency_service import list_emergency_messages

router = APIRouter(prefix="/emergency", tags=["Emergency"])


@router.get(
    "/messages",
    response_model=EmergencyMessagesResponse,
    status_code=status.HTTP_200_OK,
    summary="List Emergency Messages",
    description="Return predefined high-priority emergency communication messages and sign references.",
)
async def get_emergency_messages() -> EmergencyMessagesResponse:
    return list_emergency_messages()
