import logging
from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import redact_secrets

logger = logging.getLogger("signspeak.exceptions")


def build_error_payload(
    *,
    code: str,
    message: str,
    status_code: int,
    details: object = None,
) -> dict:
    payload = {
        "error": {
            "code": code,
            "message": redact_secrets(message),
            "status_code": status_code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }
    if details is not None:
        payload["error"]["details"] = details
    return payload


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    logger.warning(
        "HTTP %s on %s %s: %s",
        exc.status_code,
        request.method,
        request.url.path,
        redact_secrets(str(exc.detail)),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_payload(
            code="HTTP_ERROR",
            message=str(exc.detail),
            status_code=exc.status_code,
        ),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    sanitized_errors = [
        {
            "loc": err.get("loc"),
            "msg": err.get("msg"),
            "type": err.get("type"),
        }
        for err in exc.errors()
    ]
    logger.warning(
        "Validation error on %s %s: %s",
        request.method,
        request.url.path,
        sanitized_errors,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=build_error_payload(
            code="VALIDATION_ERROR",
            message="Request payload validation failed.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=sanitized_errors,
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        redact_secrets(type(exc).__name__),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=build_error_payload(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected internal error occurred.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        ),
    )
