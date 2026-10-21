"""One-line JSON logs carrying the request id, plus the audit trail helper.

Never pass tokens, OTP codes or raw phone numbers to these functions: use hash_phone().
"""
import hashlib
import hmac
import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime, timezone

from .config import settings

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        out = {
            "ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": request_id_var.get(),
        }
        out.update(getattr(record, "fields", {}))
        if record.exc_info:
            out["exc"] = self.formatException(record.exc_info)
        return json.dumps(out, ensure_ascii=False, default=str)


def setup_logging() -> None:
    """Idempotent. Attaches the JSON handler to the 'cups' logger tree only."""
    root = logging.getLogger("cups")
    if any(getattr(h, "_cups_json", False) for h in root.handlers):
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    handler._cups_json = True  # type: ignore[attr-defined]
    root.addHandler(handler)
    root.setLevel(logging.INFO)


_audit = logging.getLogger("cups.audit")


def audit(event: str, **fields) -> None:
    _audit.info(event, extra={"fields": {"event": event, **fields}})


def hash_phone(phone: str) -> str:
    """Keyed hash so the small phone-number space cannot be reversed from the logs."""
    key = settings.jwt_secret.encode()
    return hmac.new(key, b"audit-phone:" + phone.encode(), hashlib.sha256).hexdigest()[:12]
