from fastapi import APIRouter, status

from app.schemas.translation import TextToSignRequest, TextToSignResponse
from app.services.translation_service import translate_text_to_signs

router = APIRouter(prefix="/translation", tags=["Translation"])


@router.post(
    "/text-to-sign",
    response_model=TextToSignResponse,
    status_code=status.HTTP_200_OK,
    summary="Translate Text to Sign Sequence",
    description="Parse input text into supported sign demonstration steps and report any unsupported tokens.",
)
async def text_to_sign(payload: TextToSignRequest) -> TextToSignResponse:
    return translate_text_to_signs(payload)
