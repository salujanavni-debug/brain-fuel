from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized server-side configuration loaded from environment variables."""

    app_name: str = Field(default="SignSpeak API")
    app_version: str = Field(default="0.1.0")
    app_env: str = Field(default="development")
    debug: bool = Field(default=True)
    log_level: str = Field(default="INFO")

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    api_prefix: str = Field(default="/api")

    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    )

    min_confidence_threshold: float = Field(default=0.65, ge=0.0, le=1.0)
    mediapipe_hand_landmarker_task: str = Field(default="./models/hand_landmarker.task")
    gesture_model_path: str = Field(default="./models/signspeak_gesture_classifier.keras")

    # Server-side database configuration (never exposed to frontend)
    supabase_url: str = Field(default="")
    supabase_service_role_key: str = Field(default="")
    database_url: str = Field(default="")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def database_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key) or bool(
            self.database_url
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
