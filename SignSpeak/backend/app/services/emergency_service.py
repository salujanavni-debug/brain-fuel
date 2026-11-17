from app.models.gesture import EMERGENCY_CATALOG
from app.schemas.emergency import EmergencyMessageSchema, EmergencyMessagesResponse


def list_emergency_messages() -> EmergencyMessagesResponse:
    messages = [
        EmergencyMessageSchema(
            id=item.id,
            message=item.message,
            gesture_id=item.gesture_id,
            urgency=item.urgency,
            category=item.category,
            speech_rate=item.speech_rate,
        )
        for item in EMERGENCY_CATALOG
    ]
    return EmergencyMessagesResponse(total=len(messages), messages=messages)
