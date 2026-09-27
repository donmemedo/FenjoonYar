import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..auth import create_token, current_user
from ..config import settings
from ..db import get_session
from ..models import OtpCode, User

router = APIRouter(prefix="/api/auth", tags=["auth"])

PHONE_RE = r"^09\d{9}$"


class PhoneIn(BaseModel):
    phone: str = Field(pattern=PHONE_RE)


class VerifyIn(PhoneIn):
    code: str = Field(min_length=4, max_length=6)
    name: str | None = None


@router.post("/request-otp")
def request_otp(body: PhoneIn, session: Session = Depends(get_session)):
    code = f"{random.randint(1000, 9999)}"
    session.add(
        OtpCode(
            phone=body.phone,
            code=code,
            expires_at=datetime.utcnow() + timedelta(minutes=3),
        )
    )
    session.commit()
    return {"sent": True, "ttl_seconds": 180, "dev_code": code if settings.expose_otp else None}


@router.post("/verify-otp")
def verify_otp(body: VerifyIn, session: Session = Depends(get_session)):
    otp = session.exec(
        select(OtpCode)
        .where(OtpCode.phone == body.phone, OtpCode.used == False)  # noqa: E712
        .order_by(OtpCode.id.desc())
    ).first()
    if not otp or otp.code != body.code or otp.expires_at < datetime.utcnow():
        raise HTTPException(400, "invalid_code")
    otp.used = True
    user = session.exec(select(User).where(User.phone == body.phone)).first()
    if not user:
        user = User(phone=body.phone, name=body.name)
        session.add(user)
    elif body.name and not user.name:
        user.name = body.name
    session.add(otp)
    session.commit()
    session.refresh(user)
    return {"token": create_token(user), "user": public_user(user)}


def public_user(user: User) -> dict:
    return {
        "id": user.id,
        "phone": user.phone,
        "name": user.name,
        "role": user.role,
        "cafe_id": user.cafe_id,
    }


@router.get("/me")
def me(user: User = Depends(current_user)):
    return public_user(user)


class ProfileIn(BaseModel):
    name: str | None = None
    email: str | None = None


@router.patch("/me")
def update_me(
    body: ProfileIn,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        user.email = body.email
    session.add(user)
    session.commit()
    session.refresh(user)
    return public_user(user)
