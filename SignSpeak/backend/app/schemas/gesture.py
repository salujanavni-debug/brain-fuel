from typing import List, Optional

from pydantic import BaseModel, Field


class DemonstrationAssetSchema(BaseModel):
    asset_type: str = Field(..., examples=["svg_illustration"])
    identifier: str = Field(..., examples=["hello"])
    description: str


class GestureSummarySchema(BaseModel):
    id: str
    label: str
    meaning: str
    category: str
    difficulty: str


class GestureDetailSchema(GestureSummarySchema):
    handshape: str
    movement: str
    tip: str
    aliases: List[str] = Field(default_factory=list)
    demonstration_assets: List[DemonstrationAssetSchema] = Field(default_factory=list)


class GestureListResponse(BaseModel):
    total: int
    category: Optional[str] = None
    gestures: List[GestureSummarySchema]
