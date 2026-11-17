from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.gesture import GestureDetailSchema


class TextToSignRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Input text phrase to translate into supported sign demonstrations.",
    )

    @field_validator("text")
    @classmethod
    def ensure_non_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Input text cannot be empty or whitespace only.")
        return cleaned

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "Hello friend, thank you please",
            }
        }
    )


class TokenDemonstrationSchema(BaseModel):
    token: str
    supported: bool
    gesture: Optional[GestureDetailSchema] = None


class TextToSignResponse(BaseModel):
    input_text: str
    status: Literal["complete", "partial", "unsupported"]
    demonstration_mode: Literal["individual_sign_sequence"] = "individual_sign_sequence"
    grammar_notice: str = (
        "Demonstrates matching individual signs from the verified library in English token order "
        "— NOT a grammatically complete Indian Sign Language (ISL) sentence translation."
    )
    matched_count: int
    unsupported_tokens: List[str]
    demonstration_sequence: List[GestureDetailSchema]
    tokens: List[TokenDemonstrationSchema]
