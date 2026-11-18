import logging
import re
import sys

SECRET_PATTERNS = [
    re.compile(r"(Bearer\s+)[A-Za-z0-9._\-]+", re.IGNORECASE),
    re.compile(r"(service_role[\"']?\s*[:=]\s*[\"']?)[^\"'\s,;]+", re.IGNORECASE),
    re.compile(r"(apikey[\"']?\s*[:=]\s*[\"']?)[^\"'\s,;]+", re.IGNORECASE),
    re.compile(r"(postgres(?:ql)?://[^:\s]+:)[^@\s]+(@)", re.IGNORECASE),
    re.compile(r"(eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{6,})"),
]


def redact_secrets(text: str) -> str:
    """Scrub tokens, database passwords, and JWTs before emitting log lines."""
    sanitized = text
    sanitized = SECRET_PATTERNS[0].sub(r"\1[REDACTED]", sanitized)
    sanitized = SECRET_PATTERNS[1].sub(r"\1[REDACTED]", sanitized)
    sanitized = SECRET_PATTERNS[2].sub(r"\1[REDACTED]", sanitized)
    sanitized = SECRET_PATTERNS[3].sub(r"\1[REDACTED]\2", sanitized)
    sanitized = SECRET_PATTERNS[4].sub("[REDACTED_JWT]", sanitized)
    return sanitized


class SecretRedactingFilter(logging.Filter):
    """Logging filter that prevents accidental leakage of credentials or keys."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_secrets(record.msg)
        if record.args:
            if isinstance(record.args, tuple):
                record.args = tuple(
                    redact_secrets(arg) if isinstance(arg, str) else arg for arg in record.args
                )
            elif isinstance(record.args, dict):
                record.args = {
                    k: redact_secrets(v) if isinstance(v, str) else v
                    for k, v in record.args.items()
                }
        return True


def configure_logging(log_level: str = "INFO") -> logging.Logger:
    """Configure consistent structured logging with secret redaction for the SignSpeak API."""
    level = getattr(logging, log_level.upper(), logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    redacting_filter = SecretRedactingFilter()

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        handler.setFormatter(formatter)
        handler.addFilter(redacting_filter)
        root_logger.addHandler(handler)
    else:
        for handler in root_logger.handlers:
            handler.setLevel(level)
            handler.setFormatter(formatter)
            if not any(isinstance(f, SecretRedactingFilter) for f in handler.filters):
                handler.addFilter(redacting_filter)

    return logging.getLogger("signspeak")
