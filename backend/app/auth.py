import time

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from .config import settings
from .db import get_session
from .errors import ApiError
from .models import User

COOKIE_NAME = "cups_session"
CSRF_HEADER = "x-requested-with"
CSRF_VALUE = "cups-web"
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
REQUIRED_CLAIMS = ["sub", "tv", "iat", "exp"]

bearer = HTTPBearer(auto_error=False)


def create_token(user: User) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user.id),
        "tv": user.token_version,
        "iat": now,
        "exp": now + settings.jwt_ttl_hours * 3600,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode(token: str) -> tuple[int, int]:
    """Return (user_id, token_version) or raise 401. Never raises anything else."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm],
            options={"require": REQUIRED_CLAIMS},
        )
        sub, tv = payload["sub"], payload["tv"]
        if not (isinstance(sub, str) and sub.isascii() and sub.isdecimal() and type(tv) is int):
            raise ValueError("bad claim")
        return int(sub), tv
    except (jwt.PyJWTError, ValueError, TypeError, KeyError):
        raise ApiError(401, "invalid_token") from None


def current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: Session = Depends(get_session),
) -> User:
    via_cookie = creds is None
    token = creds.credentials if creds else request.cookies.get(COOKIE_NAME)
    if not token:
        raise ApiError(401, "not_authenticated")
    # A cookie is sent by the browser on its own, so unsafe methods need the custom header
    # that a cross-site form or fetch() without CORS approval cannot add.
    if via_cookie and request.method not in SAFE_METHODS and request.headers.get(CSRF_HEADER) != CSRF_VALUE:
        raise ApiError(403, "csrf")
    uid, tv = _decode(token)
    user = session.get(User, uid)  # role and cafe binding are always re-read from the database
    if user is None:
        raise ApiError(401, "user_not_found")
    if user.token_version != tv:
        raise ApiError(401, "invalid_token")
    return user


def current_partner(user: User = Depends(current_user)) -> User:
    if user.role not in ("partner", "admin") or not user.cafe_id:
        raise ApiError(403, "partner_only")
    return user
