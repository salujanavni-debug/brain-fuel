from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SubsystemReadiness(BaseModel):
    api: Literal["ready"] = "ready"
    ai_pipeline: Literal["initialized", "pending_models"] = "pending_models"
    database: Literal["configured", "unconfigured"] = "unconfigured"


class HealthResponse(BaseModel):
    status: Literal["ok"] = Field(default="ok")
    service: str = Field(default="SignSpeak API")
    version: str = Field(default="0.1.0")
    environment: str = Field(default="development")
    timestamp: datetime
    subsystems: SubsystemReadiness
