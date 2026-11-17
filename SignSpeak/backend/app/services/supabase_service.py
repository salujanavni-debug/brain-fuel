"""Optional server-side Supabase PostgreSQL client helper.

Never exposes SUPABASE_SERVICE_ROLE_KEY to the frontend and never stores
webcam frames or raw camera video in the database.
"""

from typing import Optional

from app.core.config import get_settings

try:
    from supabase import Client, create_client  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - optional runtime dependency
    Client = None  # type: ignore[assignment]
    create_client = None  # type: ignore[assignment]


def get_supabase_admin_client() -> Optional["Client"]:
    settings = get_settings()
    if (
        not settings.supabase_url
        or not settings.supabase_service_role_key
        or "your-project-ref" in settings.supabase_url
        or create_client is None
    ):
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
