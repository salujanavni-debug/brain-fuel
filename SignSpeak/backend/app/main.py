import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import get_settings
from app.core.exceptions import (
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


def create_application() -> FastAPI:
    settings = get_settings()
    logger = configure_logging(settings.log_level)

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "SignSpeak REST API for sign language gesture vocabulary, MediaPipe hand-landmark "
            "classification, interactive learning quizzes, emergency phrases, and text-to-sign sequencing."
        ),
        openapi_tags=OPENAPI_TAGS,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.middleware("http")
    async def request_logging_middleware(request: Request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
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
            "docs": "/docs",
            "health": f"{settings.api_prefix}/health",
        }

    return application


app = create_application()
