import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..auth import current_user
from ..db import get_session
from ..models import Cafe, CreditBatch, Order, Plan, Redemption, User

router = APIRouter(prefix="/api", tags=["wallet"])

SETTLEMENT_RATE = 0.72  # share of the cup price paid back to the cafe


def active_batches(session: Session, user_id: int) -> list[CreditBatch]:
    now = datetime.utcnow()
    batches = session.exec(
        select(CreditBatch)
        .where(CreditBatch.user_id == user_id)
        .order_by(CreditBatch.expires_at)
    ).all()
    return [b for b in batches if b.expires_at > now and b.cups_used < b.cups_total]


@router.get("/wallet")
def wallet(user: User = Depends(current_user), session: Session = Depends(get_session)):
    batches = active_batches(session, user.id)
    remaining = sum(b.cups_total - b.cups_used for b in batches)
    next_expiry = batches[0].expires_at.isoformat() + "Z" if batches else None
    expiring_soon = sum(
        b.cups_total - b.cups_used
        for b in batches
        if b.expires_at < datetime.utcnow() + timedelta(days=14)
    )
    orders = session.exec(
        select(Order).where(Order.user_id == user.id).order_by(Order.id.desc())
    ).all()
    total_bought = sum(o.cups for o in orders if o.status == "paid")
    return {
        "cups_remaining": remaining,
        "cups_used": total_bought - remaining,
        "total_bought": total_bought,
        "expiring_soon": expiring_soon,
        "next_expiry": next_expiry,
        "batches": [
            {
                "id": b.id,
                "remaining": b.cups_total - b.cups_used,
                "total": b.cups_total,
                "expires_at": b.expires_at.isoformat() + "Z",
            }
            for b in batches
        ],
    }


class BuyIn(BaseModel):
    plan_slug: str


@router.post("/orders")
def create_order(
    body: BuyIn,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    plan = session.exec(select(Plan).where(Plan.slug == body.plan_slug)).first()
    if not plan:
        raise HTTPException(404, "plan_not_found")
    order = Order(
        user_id=user.id, plan_id=plan.id, cups=plan.cups,
        amount_toman=plan.price_toman, status="paid",
    )
    session.add(order)
    session.commit()
    session.refresh(order)
    session.add(
        CreditBatch(
            user_id=user.id, order_id=order.id, cups_total=plan.cups,
            expires_at=datetime.utcnow() + timedelta(days=plan.validity_days),
        )
    )
    session.commit()
    return {
        "id": order.id, "cups": order.cups, "amount": order.amount_toman,
        "status": order.status, "created_at": order.created_at.isoformat() + "Z",
        "plan": {"slug": plan.slug, "fa": plan.title_fa, "en": plan.title_en},
    }


@router.get("/orders")
def list_orders(user: User = Depends(current_user), session: Session = Depends(get_session)):
    orders = session.exec(
        select(Order).where(Order.user_id == user.id).order_by(Order.id.desc())
    ).all()
    plans = {p.id: p for p in session.exec(select(Plan)).all()}
    return [
        {
            "id": o.id, "cups": o.cups, "amount": o.amount_toman, "status": o.status,
            "created_at": o.created_at.isoformat() + "Z",
            "plan": {
                "slug": plans[o.plan_id].slug,
                "fa": plans[o.plan_id].title_fa,
                "en": plans[o.plan_id].title_en,
            },
        }
        for o in orders
    ]


class RedeemIn(BaseModel):
    cafe_slug: str | None = None
    drink: str = "espresso"


@router.post("/redemptions")
def create_redemption(
    body: RedeemIn,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    batches = active_batches(session, user.id)
    if not batches:
        raise HTTPException(400, "no_cups_left")
    cafe = None
    if body.cafe_slug:
        cafe = session.exec(select(Cafe).where(Cafe.slug == body.cafe_slug)).first()
    red = Redemption(
        user_id=user.id,
        cafe_id=cafe.id if cafe else None,
        code=f"{random.randint(100000, 999999)}",
        drink=body.drink,
    )
    session.add(red)
    session.commit()
    session.refresh(red)
    return redemption_dict(red, session)


def redemption_dict(r: Redemption, session: Session) -> dict:
    cafe = session.get(Cafe, r.cafe_id) if r.cafe_id else None
    return {
        "id": r.id, "code": r.code, "drink": r.drink, "status": r.status,
        "created_at": r.created_at.isoformat() + "Z",
        "expires_at": r.expires_at.isoformat() + "Z",
        "confirmed_at": r.confirmed_at.isoformat() + "Z" if r.confirmed_at else None,
        "cafe": {"slug": cafe.slug, "fa": cafe.name_fa, "en": cafe.name_en} if cafe else None,
        "qr_payload": f"cups://redeem/{r.code}",
    }


@router.get("/redemptions")
def list_redemptions(
    user: User = Depends(current_user), session: Session = Depends(get_session)
):
    rows = session.exec(
        select(Redemption).where(Redemption.user_id == user.id).order_by(Redemption.id.desc())
    ).all()
    now = datetime.utcnow()
    for r in rows:
        if r.status == "pending" and r.expires_at < now:
            r.status = "expired"
            session.add(r)
    session.commit()
    return [redemption_dict(r, session) for r in rows]


@router.get("/redemptions/{code}")
def get_redemption(
    code: str,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    r = session.exec(
        select(Redemption).where(Redemption.code == code, Redemption.user_id == user.id)
    ).first()
    if not r:
        raise HTTPException(404, "not_found")
    if r.status == "pending" and r.expires_at < datetime.utcnow():
        r.status = "expired"
        session.add(r)
        session.commit()
    return redemption_dict(r, session)
