"""Initial prototype gesture vocabulary and authentic ISL verification metadata."""

from typing import Dict, List, TypedDict


class PrototypeGestureSpec(TypedDict):
    id: str
    label: str
    gesture_type: str  # "static" or "dynamic"
    expected_hands: str
    isl_verification_status: str
    collection_notes: str


ISL_PROTOTYPE_DISCLAIMER = (
    "These 8 labels are an initial prototype vocabulary only, NOT automatically verified "
    "Indian Sign Language (ISL) translations. Before clinical, educational, or public "
    "deployment, validate handshape, palm orientation, facial/non-manual markers, movement "
    "trajectory, and ISL grammar with qualified ISL interpreters and Deaf community contributors."
)

INITIAL_PROTOTYPE_VOCABULARY: List[PrototypeGestureSpec] = [
    {
        "id": "hello",
        "label": "Hello",
        "gesture_type": "dynamic",
        "expected_hands": "1 hand (dynamic wave/salute)",
        "isl_verification_status": "unverified_prototype",
        "collection_notes": "Record full 24-frame motion sequence including start and outward sweep.",
    },
    {
        "id": "thank-you",
        "label": "Thank You",
        "gesture_type": "dynamic",
        "expected_hands": "1 hand (chin-forward trajectory)",
        "isl_verification_status": "unverified_prototype",
        "collection_notes": "Record temporal sequence capturing outward hand trajectory from chin.",
    },
    {
        "id": "yes",
        "label": "Yes",
        "gesture_type": "dynamic",
        "expected_hands": "1 hand (nodding fist motion)",
        "isl_verification_status": "unverified_prototype",
        "collection_notes": "Record wrist flexion motion over sequence window rather than static pose.",
    },
    {
        "id": "no",
        "label": "No",
        "gesture_type": "dynamic",
        "expected_hands": "1 hand (finger tap/shake motion)",
        "isl_verification_status": "unverified_prototype",
        "collection_notes": "Record temporal sequence across closing/shaking motion.",
    },
    {
        "id": "help",
        "label": "Help",
        "gesture_type": "dynamic",
        "expected_hands": "2 hands (base palm + lifting fist)",
        "isl_verification_status": "unverified_prototype",
        "collection_notes": "Keep both hands visible in frame during upward lifting motion.",
    },
    {
        "id": "stop",
        "label": "Stop",
        "gesture_type": "static",
        "expected_hands": "1 or 2 hands (open raised palm hold)",
        "isl_verification_status": "unverified_prototype",
        "collection_notes": "Collect varied distances and slight camera angles with steady palm.",
    },
    {
        "id": "please",
        "label": "Please",
        "gesture_type": "dynamic",
        "expected_hands": "1 hand (circular chest motion)",
        "isl_verification_status": "unverified_prototype",
        "collection_notes": "Record full circular palm trajectory across 24 frames.",
    },
    {
        "id": "love",
        "label": "I Love You",
        "gesture_type": "static",
        "expected_hands": "1 hand (thumb, index, pinky extended)",
        "isl_verification_status": "unverified_prototype",
        "collection_notes": "Collect varied angles and handedness (left & right); verify regional ISL sign usage.",
    },
]

UNKNOWN_CLASS_ID = "unknown"
UNKNOWN_CLASS_LABEL = "Unknown"

LABEL_BY_ID: Dict[str, str] = {
    item["id"]: item["label"] for item in INITIAL_PROTOTYPE_VOCABULARY
}
TYPE_BY_ID: Dict[str, str] = {
    item["id"]: item["gesture_type"] for item in INITIAL_PROTOTYPE_VOCABULARY
}
ID_BY_LABEL: Dict[str, str] = {
    item["label"].lower(): item["id"] for item in INITIAL_PROTOTYPE_VOCABULARY
}
