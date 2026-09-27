from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..auth import current_partner
from ..db import get_session
from ..models import Cafe, Redemption, User
from ..routers.wallet import SETTLEMENT_RATE, active_batches

router = APIRouter(prefix="/api/partner", tags=["partner"])


class ConfirmIn(BaseModel):
    code: str


@router.post("/redemptions/confirm")
def confirm(
    body: ConfirmIn,
    partner: User = Depends(current_partner),
    session: Session = Depends(get_session),
):
    red = session.exec(select(Redemption).where(Redemption.code == body.code)).first()
    if not red:
        raise HTTPException(404, "code_not_found")
    if red.status == "confirmed":
        raise HTTPException(409, "already_used")
    if red.expires_at < datetime.utcnow():
        red.status = "expired"
        session.add(red)
        session.commit()
        raise HTTPException(410, "code_expired")

    batches = active_batches(session, red.user_id)
    if not batches:
        raise HTTPException(400, "no_cups_left")
    batch = batches[0]
    batch.cups_used += 1

    avg_cup_price = 89_000  # average menu price used for cafe settlement
    red.cafe_id = partner.cafe_id
    red.status = "confirmed"
    red.confirmed_at = datetime.utcnow()
    red.settle_toman = int(avg_cup_price * SETTLEMENT_RATE)
    session.add(batch)
    session.add(red)
    session.commit()
    customer = session.get(User, red.user_id)
    return {
        "ok": True,
        "code": red.code,
        "drink": red.drink,
        "customer": {"name": customer.name, "phone": customer.phone[-4:]},
        "settle_toman": red.settle_toman,
        "confirmed_at": red.confirmed_at.isoformat() + "Z",
    }


@router.get("/summary")
def summary(
    partner: User = Depends(current_partner), session: Session = Depends(get_session)
):
    cafe = session.get(Cafe, partner.cafe_id)
    rows = session.exec(
        select(Redemption)
        .where(Redemption.cafe_id == partner.cafe_id, Redemption.status == "confirmed")
        .order_by(Redemption.id.desc())
    ).all()
    now = datetime.utcnow()
    today = [r for r in rows if r.confirmed_at and r.confirmed_at.date() == now.date()]
    week = [r for r in rows if r.confirmed_at and r.confirmed_at > now - timedelta(days=7)]
    by_day = {}
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        by_day[day.isoformat()] = 0
    for r in week:
        key = r.confirmed_at.date().isoformat()
        if key in by_day:
            by_day[key] += 1
    unique = len({r.user_id for r in week})
    return {
        "cafe": {"slug": cafe.slug, "fa": cafe.name_fa, "en": cafe.name_en} if cafe else None,
        "today_cups": len(today),
        "today_settle": sum(r.settle_toman for r in today),
        "week_cups": len(week),
        "week_settle": sum(r.settle_toman for r in week),
        "unique_customers": unique,
        "pending_settlement": sum(r.settle_toman for r in week),
        "chart": [{"day": k, "cups": v} for k, v in by_day.items()],
        "recent": [
            {
                "code": r.code, "drink": r.drink,
                "at": r.confirmed_at.isoformat() + "Z" if r.confirmed_at else None,
                "settle": r.settle_toman,
            }
            for r in rows[:12]
        ],
    }
