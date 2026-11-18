import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import Settings, get_settings
from app.core.exceptions import (
    build_error_payload,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import configure_logging

OPENAPI_TAGS = [
    {"name": "Health", "description": "Service health and subsystem readiness checks."},
    {"name": "Gestures", "description": "Supported sign language vocabulary and detail guides."},
    {
        "name": "Recognition",
        "description": "Single-frame and batch hand-landmark gesture recognition endpoints.",
    },
    {"name": "Learning", "description": "Learning categories, guides, and interactive quizzes."},
    {"name": "Emergency", "description": "Predefined urgent communication messages."},
    {"name": "Translation", "description": "Text-to-sign demonstration sequence translation."},
]


class SlidingWindowRateLimiter:
    """Thread-safe per-IP sliding-window rate limiter for API routes."""

    def __init__(self, max_requests: int = 120, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, client_key: str, now: Optional[float] = None) -> tuple[bool, int, int]:
        ts = now if now is not None else time.monotonic()
        cutoff = ts - self.window_seconds
        with self._lock:
            queue = self._hits[client_key]
            while queue and queue[0] <= cutoff:
                queue.popleft()
            if len(queue) >= self.max_requests:
                retry_after = max(1, int(self.window_seconds - (ts - queue[0])) + 1)
                return False, 0, retry_after
            queue.append(ts)
            remaining = max(0, self.max_requests - len(queue))
            return True, remaining, 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def create_application(custom_settings: Optional[Settings] = None) -> FastAPI:
    settings = custom_settings or get_settings()
    logger = configure_logging(settings.log_level)
    rate_limiter = SlidingWindowRateLimiter(
        max_requests=settings.rate_limit_per_minute,
        window_seconds=60,
    )

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "SignSpeak REST API for sign language gesture vocabulary, MediaPipe hand-landmark "
            "classification, interactive learning quizzes, emergency phrases, and text-to-sign sequencing."
        ),
        openapi_tags=OPENAPI_TAGS,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )
    application.state.rate_limiter = rate_limiter

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept"],
    )

    @application.middleware("http")
    async def security_and_rate_limit_middleware(request: Request, call_next):
        if (
            settings.enable_rate_limit
            and request.url.path.startswith(settings.api_prefix)
            and request.url.path != f"{settings.api_prefix}/health"
        ):
            forwarded_for = request.headers.get("x-forwarded-for", "")
            client_ip = (
                forwarded_for.split(",")[0].strip()
                if forwarded_for
                else (request.client.host if request.client else "unknown")
            )
            allowed, remaining, retry_after = rate_limiter.check(client_ip)
            if not allowed:
                logger.warning("Rate limit exceeded for IP %s on %s", client_ip, request.url.path)
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    headers={"Retry-After": str(retry_after)},
                    content=build_error_payload(
                        code="RATE_LIMIT_EXCEEDED",
                        message="Too many requests. Please slow down and try again shortly.",
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    ),
                )
        else:
            remaining = settings.rate_limit_per_minute

        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self)"
        if request.url.path.startswith(settings.api_prefix):
            response.headers["X-RateLimit-Limit"] = str(settings.rate_limit_per_minute)
            response.headers["X-RateLimit-Remaining"] = str(remaining)

        logger.info(
            "%s %s -> %s (%.1f ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response

    application.add_exception_handler(HTTPException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
    application.add_exception_handler(Exception, unhandled_exception_handler)

    application.include_router(api_router, prefix=settings.api_prefix)

    @application.get("/", tags=["Root"], summary="API Root Metadata")
    async def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs" if not settings.is_production else "disabled_in_production",
            "health": f"{settings.api_prefix}/health",
        }

    return application


app = create_application()
