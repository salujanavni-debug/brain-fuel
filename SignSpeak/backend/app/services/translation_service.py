import re
from typing import Dict, List

from app.models.gesture import GESTURE_CATALOG, GestureDefinition
from app.schemas.gesture import GestureDetailSchema
from app.schemas.translation import (
    TextToSignRequest,
    TextToSignResponse,
    TokenDemonstrationSchema,
)
from app.services.gesture_service import to_gesture_detail


def _build_lookup_index() -> Dict[str, GestureDefinition]:
    index: Dict[str, GestureDefinition] = {}
    for gesture in GESTURE_CATALOG:
        index[gesture.label.lower()] = gesture
        index[gesture.id.lower()] = gesture
        for alias in gesture.aliases:
            index[alias.lower()] = gesture
    return index


def translate_text_to_signs(payload: TextToSignRequest) -> TextToSignResponse:
    cleaned = re.sub(r"[^\w\s]", " ", payload.text.lower()).strip()
    words = [w for w in cleaned.split() if w]

    lookup = _build_lookup_index()
    demonstration_sequence: List[GestureDetailSchema] = []
    unsupported_tokens: List[str] = []
    tokens: List[TokenDemonstrationSchema] = []

    i = 0
    while i < len(words):
        matched_gesture = None
        matched_phrase = None

        for span in (3, 2, 1):
            if i + span <= len(words):
                candidate = " ".join(words[i : i + span])
                if candidate in lookup:
                    matched_gesture = lookup[candidate]
                    matched_phrase = candidate
                    i += span
                    break

        if matched_gesture and matched_phrase:
            detail = to_gesture_detail(matched_gesture)
            demonstration_sequence.append(detail)
            tokens.append(
                TokenDemonstrationSchema(
                    token=matched_phrase,
                    supported=True,
                    gesture=detail,
                )
            )
        else:
            token = words[i]
            unsupported_tokens.append(token)
            tokens.append(
                TokenDemonstrationSchema(
                    token=token,
                    supported=False,
                    gesture=None,
                )
            )
            i += 1

    if not demonstration_sequence:
        translation_status = "unsupported"
    elif unsupported_tokens:
        translation_status = "partial"
    else:
        translation_status = "complete"

    return TextToSignResponse(
        input_text=payload.text,
        status=translation_status,
        matched_count=len(demonstration_sequence),
        unsupported_tokens=unsupported_tokens,
        demonstration_sequence=demonstration_sequence,
        tokens=tokens,
    )
