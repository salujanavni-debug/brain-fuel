from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized server-side configuration loaded from environment variables."""

    app_name: str = Field(default="SignSpeak API")
    app_version: str = Field(default="0.1.0")
    app_env: str = Field(default="development")
    debug: bool = Field(default=False)
    log_level: str = Field(default="INFO")

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    api_prefix: str = Field(default="/api")

    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    )
    enable_rate_limit: bool = Field(default=True)
    rate_limit_per_minute: int = Field(default=120, ge=5, le=10000)

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
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        if self.is_production:
            # Never permit wildcard '*' in production when credentials are enabled
            return [origin for origin in origins if origin != "*"]
        return origins

    @property
    def database_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key) or bool(
            self.database_url
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
