import hashlib
import hmac
import math
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel
from sqlmodel import Session, select, update

from ..auth import COOKIE_NAME, create_token, current_user
from ..config import settings
from ..db import get_session, run
from ..errors import ApiError
from ..models import OtpCode, User, utcnow
from ..observability import audit, hash_phone
from ..ratelimit import client_ip, enforce
from ..schemas import Email, Name, OtpCodeIn, Phone

router = APIRouter(prefix="/api/auth", tags=["auth"])

OTP_TTL = 180  # seconds a code stays valid
OTP_COOLDOWN = 60  # seconds before the same phone may ask for another code
OTP_MAX_ATTEMPTS = 5


class PhoneIn(BaseModel):
    phone: Phone


class VerifyIn(PhoneIn):
    code: OtpCodeIn
    name: Name | None = None


def code_hash(phone: str, code: str) -> str:
    """HMAC-SHA256 keyed by the JWT secret: a leaked database cannot be used to read live codes."""
    return hmac.new(settings.jwt_secret.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


@router.post("/request-otp")
def request_otp(body: PhoneIn, request: Request, session: Session = Depends(get_session)):
    ip = client_ip(request)
    enforce("request_otp_ip", f"otp:ip:{ip}", 10, 600)
    now = utcnow()
    last = session.exec(
        select(OtpCode.created_at).where(OtpCode.phone == body.phone).order_by(OtpCode.id.desc()).limit(1)
    ).first()
    if last is not None:
        wait = OTP_COOLDOWN - (now - last).total_seconds()
        if wait > 0:
            retry = math.ceil(wait)
            audit("rate_limited", limiter="otp_cooldown", phone=hash_phone(body.phone), ip=ip, retry_after=retry)
            raise ApiError(429, "otp_cooldown", retry_after=retry)
    enforce("request_otp_phone", f"otp:phone:{body.phone}", 5, 3600)

    code = f"{secrets.randbelow(10**6):06d}"
    # one live code per phone: a new request kills the previous one
    run(session, update(OtpCode).where(OtpCode.phone == body.phone, OtpCode.used == False).values(used=True))  # noqa: E712
    session.add(
        OtpCode(
            phone=body.phone, code=code_hash(body.phone, code),
            expires_at=now + timedelta(seconds=OTP_TTL), created_at=now,
        )
    )
    session.commit()
    # ponytail: no SMS provider is wired yet. Send `code` here (never log it); DEMO_MODE returns it instead.
    audit("otp_requested", phone=hash_phone(body.phone), ip=ip)
    return {
        "sent": True,
        "ttl_seconds": OTP_TTL,
        "resend_after_seconds": OTP_COOLDOWN,
        "dev_code": code if settings.demo_mode else None,
    }


def _fail_login(phone: str, ip: str, reason: str) -> ApiError:
    audit("login_failed", phone=hash_phone(phone), ip=ip, reason=reason)
    return ApiError(400, "invalid_code")  # same answer for wrong, expired, used and locked


@router.post("/verify-otp")
def verify_otp(body: VerifyIn, request: Request, response: Response, session: Session = Depends(get_session)):
    ip = client_ip(request)
    enforce("verify_otp_ip", f"verify:ip:{ip}", 30, 600)
    enforce("verify_otp_phone", f"verify:phone:{body.phone}", 10, 600)
    now = utcnow()
    otp = session.exec(
        select(OtpCode).where(OtpCode.phone == body.phone, OtpCode.used == False)  # noqa: E712
        .order_by(OtpCode.id.desc()).limit(1)
    ).first()
    if otp is None:
        raise _fail_login(body.phone, ip, "no_code")

    otp_id, stored = otp.id, otp.code  # plain values: the bulk UPDATEs below do not sync the ORM object
    # Claim one attempt atomically BEFORE comparing: parallel guesses cannot exceed the cap.
    claim = run(
        session,
        update(OtpCode)
        .where(OtpCode.id == otp_id, OtpCode.used == False, OtpCode.attempts < OTP_MAX_ATTEMPTS,  # noqa: E712
               OtpCode.expires_at > now)
        .values(attempts=OtpCode.attempts + 1),
    )
    session.commit()
    if claim.rowcount != 1:
        raise _fail_login(body.phone, ip, "expired_used_or_locked")
    if not hmac.compare_digest(stored, code_hash(body.phone, body.code)):
        raise _fail_login(body.phone, ip, "bad_code")

    # Burn it: only one concurrent caller can flip used 0 -> 1.
    burn = run(session, update(OtpCode).where(OtpCode.id == otp_id, OtpCode.used == False).values(used=True))  # noqa: E712
    if burn.rowcount != 1:
        session.rollback()
        raise _fail_login(body.phone, ip, "lost_race")
    run(session, update(OtpCode).where(OtpCode.phone == body.phone, OtpCode.used == False).values(used=True))  # noqa: E712
    user = session.exec(select(User).where(User.phone == body.phone)).first()
    if user is None:
        user = User(phone=body.phone, name=body.name or None)
        session.add(user)
    elif body.name and not user.name:
        user.name = body.name
    session.commit()

    token = create_token(user)
    response.set_cookie(
        COOKIE_NAME, token, max_age=settings.jwt_ttl_hours * 3600, path="/",
        httponly=True, secure=settings.cookie_secure, samesite="lax",
    )
    audit("login_ok", user_id=user.id, phone=hash_phone(user.phone), ip=ip)
    out: dict = {"user": public_user(user)}
    if request.headers.get("x-client") == "native":
        out["token"] = token  # native apps cannot rely on a cookie jar; web clients never see the JWT
    return out


@router.post("/logout", status_code=204)
def logout(user: User = Depends(current_user), session: Session = Depends(get_session)):
    run(session, update(User).where(User.id == user.id).values(token_version=User.token_version + 1))
    session.commit()
    audit("logout", user_id=user.id)
    resp = Response(status_code=204)
    resp.delete_cookie(COOKIE_NAME, path="/", httponly=True, secure=settings.cookie_secure, samesite="lax")
    return resp


def public_user(user: User) -> dict:
    return {
        "id": user.id, "phone": user.phone, "name": user.name,
        "role": user.role, "cafe_id": user.cafe_id,
    }


@router.get("/me")
def me(user: User = Depends(current_user)):
    return public_user(user)


class ProfileIn(BaseModel):
    name: Name | None = None
    email: Email | None = None


@router.patch("/me")
def update_me(body: ProfileIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    if body.name is not None:
        user.name = body.name or None
    if body.email is not None:
        user.email = body.email or None
    session.add(user)
    session.commit()
    return public_user(user)
