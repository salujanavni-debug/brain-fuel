from typing import List, Optional

from fastapi import HTTPException, status

from app.models.gesture import GESTURE_CATALOG, GestureDefinition
from app.schemas.gesture import (
    DemonstrationAssetSchema,
    GestureDetailSchema,
    GestureListResponse,
    GestureSummarySchema,
)


def to_gesture_detail(gesture: GestureDefinition) -> GestureDetailSchema:
    return GestureDetailSchema(
        id=gesture.id,
        label=gesture.label,
        meaning=gesture.meaning,
        category=gesture.category,
        difficulty=gesture.difficulty,
        handshape=gesture.handshape,
        movement=gesture.movement,
        tip=gesture.tip,
        aliases=list(gesture.aliases),
        demonstration_assets=[
            DemonstrationAssetSchema(
                asset_type=asset.asset_type,
                identifier=asset.identifier,
                description=asset.description,
            )
            for asset in gesture.assets
        ],
    )


def list_gestures(
    *, category: Optional[str] = None, search: Optional[str] = None
) -> GestureListResponse:
    items: List[GestureDefinition] = GESTURE_CATALOG

    if category:
        normalized_cat = category.strip().lower()
        if normalized_cat != "all":
            items = [g for g in items if g.category.lower() == normalized_cat]

    if search:
        query = search.strip().lower()
        items = [
            g
            for g in items
            if query in g.label.lower()
            or query in g.meaning.lower()
            or query in g.category.lower()
            or any(query in alias for alias in g.aliases)
        ]

    summaries = [
        GestureSummarySchema(
            id=g.id,
            label=g.label,
            meaning=g.meaning,
            category=g.category,
            difficulty=g.difficulty,
        )
        for g in items
    ]

    return GestureListResponse(
        total=len(summaries),
        category=category,
        gestures=summaries,
    )


def get_gesture_by_id(gesture_id: str) -> GestureDetailSchema:
    normalized_id = gesture_id.strip().lower()
    for gesture in GESTURE_CATALOG:
        if gesture.id.lower() == normalized_id:
            return to_gesture_detail(gesture)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Gesture '{gesture_id}' was not found in the supported vocabulary.",
    )
