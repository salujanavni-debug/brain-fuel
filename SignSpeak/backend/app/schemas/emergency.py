from typing import List

from pydantic import BaseModel


class EmergencyMessageSchema(BaseModel):
    id: str
    message: str
    gesture_id: str
    urgency: str
    category: str
    speech_rate: float


class EmergencyMessagesResponse(BaseModel):
    total: int
    messages: List[EmergencyMessageSchema]
