"""Pure-ASGI middleware (no BaseHTTPMiddleware: no per-request task, bodies are not buffered)."""
import logging
import re
import time
import uuid

from fastapi.responses import JSONResponse
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .config import Settings
from .errors import ApiError
from .observability import request_id_var

log = logging.getLogger("cups.http")

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
RID_RE = re.compile(r"^[A-Za-z0-9._-]{8,64}$")
DEV_ORIGIN_RE = re.compile(r"http://(localhost|127\.0\.0\.1)(:\d+)?")
DOCS_PATHS = frozenset({"/docs", "/docs/oauth2-redirect", "/redoc", "/openapi.json"})
PUBLIC_CACHE = "public, max-age=60, stale-while-revalidate=300"


def origin_allowed(origin: str, cfg: Settings) -> bool:
    return origin in cfg.cors_origins or (cfg.is_dev and DEV_ORIGIN_RE.fullmatch(origin) is not None)


def log_path(scope: Scope) -> str:
    """Route template (/api/redemptions/{code}): a live redemption code in a URL must never reach the logs."""
    return getattr(scope.get("route"), "path", scope["path"])


def is_public_catalog(method: str, path: str) -> bool:
    return method == "GET" and (path in ("/api/plans", "/api/cafes", "/api/stats") or path.startswith("/api/cafes/"))


class HardeningMiddleware:
    """Outermost layer: request id, security headers, cache policy, access log, 500 handler."""

    def __init__(self, app: ASGIApp, cfg: Settings) -> None:
        self.app, self.cfg = app, cfg
        self.hsts = cfg.is_prod and cfg.cookie_secure

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        incoming = Headers(scope=scope).get("x-request-id", "")
        rid = incoming if RID_RE.fullmatch(incoming) else uuid.uuid4().hex
        token = request_id_var.set(rid)
        method, path = scope["method"], scope["path"]
        state = {"status": 500, "started": False}
        t0 = time.perf_counter()

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                state["status"], state["started"] = message["status"], True
                h = MutableHeaders(scope=message)
                h["X-Request-ID"] = rid
                h["X-Content-Type-Options"] = "nosniff"
                h["Referrer-Policy"] = "no-referrer"
                h["X-Frame-Options"] = "DENY"
                if not (self.cfg.is_dev and path in DOCS_PATHS):
                    h["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
                if self.hsts:
                    h["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
                public = state["status"] == 200 and is_public_catalog(method, path)
                h["Cache-Control"] = PUBLIC_CACHE if public else "no-store"
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            log.exception("unhandled_error", extra={"fields": {"method": method, "path": log_path(scope)}})
            if state["started"]:
                raise
            resp = JSONResponse({"detail": "internal_error", "request_id": rid}, status_code=500)
            await resp(scope, receive, send_wrapper)
        finally:
            ms = round((time.perf_counter() - t0) * 1000, 1)
            log.info("request", extra={"fields": {"method": method, "path": log_path(scope), "status": state["status"], "ms": ms}})
            request_id_var.reset(token)


class GuardMiddleware:
    """Inner layer: cross-site Origin check on unsafe methods and the request body size cap."""

    def __init__(self, app: ASGIApp, cfg: Settings) -> None:
        self.app, self.cfg = app, cfg

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = Headers(scope=scope)
        if scope["method"] not in SAFE_METHODS:
            origin = headers.get("origin")
            if origin is not None and not origin_allowed(origin, self.cfg):
                await self._reject(scope, receive, send, ApiError(403, "bad_origin"))
                return
        limit = self.cfg.max_body_bytes
        declared = headers.get("content-length")
        if declared is not None:
            try:
                too_big = int(declared) > limit
            except ValueError:
                too_big = True
            if too_big:
                await self._reject(scope, receive, send, ApiError(413, "payload_too_large"))
                return
        seen = 0

        async def counting_receive() -> Message:
            nonlocal seen
            msg = await receive()
            if msg["type"] == "http.request":
                seen += len(msg.get("body", b""))
                if seen > limit:  # chunked body that lies about, or omits, its length
                    raise ApiError(413, "payload_too_large")
            return msg

        await self.app(scope, counting_receive, send)

    @staticmethod
    async def _reject(scope: Scope, receive: Receive, send: Send, err: ApiError) -> None:
        await JSONResponse(err.body(), status_code=err.status_code)(scope, receive, send)
