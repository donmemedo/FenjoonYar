import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import case
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, func, select, update

from ..auth import current_user
from ..config import settings
from ..db import get_session, run
from ..errors import ApiError
from ..models import Cafe, CreditBatch, Order, Plan, Redemption, User, iso, utcnow
from ..observability import audit
from ..ratelimit import enforce
from ..schemas import Drink, Slug

router = APIRouter(prefix="/api", tags=["wallet"])

LIST_LIMIT = 100  # ponytail: newest 100 rows; add cursor pagination if histories grow
CODE_RETRIES = 5


def usable_batches(user_id: int, now):
    """Batches of this user with cups left that have not expired."""
    return (
        CreditBatch.user_id == user_id,
        CreditBatch.cups_used < CreditBatch.cups_total,
        CreditBatch.expires_at > now,
    )


def debit_one_cup(session: Session, user_id: int, now) -> bool:
    """Take one cup from the oldest-expiring usable batch in ONE conditional UPDATE.

    The subquery picks the batch and the outer WHERE re-checks the guard, so two concurrent
    debits can never push cups_used past cups_total. Returns True when a cup was taken.
    """
    pick = (
        select(CreditBatch.id).where(*usable_batches(user_id, now))
        .order_by(CreditBatch.expires_at, CreditBatch.id).limit(1)
        .correlate(None).scalar_subquery()
    )
    res = run(
        session,
        update(CreditBatch)
        .where(CreditBatch.id == pick, CreditBatch.cups_used < CreditBatch.cups_total)
        .values(cups_used=CreditBatch.cups_used + 1),
    )
    return res.rowcount == 1


@router.get("/wallet")
def wallet(user: User = Depends(current_user), session: Session = Depends(get_session)):
    now = utcnow()
    soon = now + timedelta(days=14)
    unused = CreditBatch.cups_total - CreditBatch.cups_used
    live = CreditBatch.expires_at > now

    def total(expr):
        return func.coalesce(func.sum(expr), 0)

    bought, used, remaining, expired, expiring = session.exec(
        select(
            total(CreditBatch.cups_total),
            total(CreditBatch.cups_used),
            total(case((live, unused), else_=0)),
            total(case((~live, unused), else_=0)),
            total(case((live & (CreditBatch.expires_at < soon), unused), else_=0)),
        ).where(CreditBatch.user_id == user.id)
    ).one()
    batches = session.exec(
        select(CreditBatch.id, CreditBatch.cups_total, CreditBatch.cups_used, CreditBatch.expires_at)
        .where(*usable_batches(user.id, now)).order_by(CreditBatch.expires_at, CreditBatch.id)
    ).all()
    return {
        "cups_remaining": remaining,
        "cups_used": used,
        "cups_expired": expired,
        "total_bought": bought,
        "expiring_soon": expiring,
        "next_expiry": iso(batches[0].expires_at) if batches else None,
        "batches": [
            {"id": b.id, "remaining": b.cups_total - b.cups_used, "total": b.cups_total,
             "expires_at": iso(b.expires_at)}
            for b in batches
        ],
    }


class BuyIn(BaseModel):
    plan_slug: Slug


def order_dict(o: Order, p: Plan) -> dict:
    return {
        "id": o.id, "cups": o.cups, "amount": o.amount_toman, "status": o.status,
        "created_at": iso(o.created_at), "plan": {"slug": p.slug, "fa": p.title_fa, "en": p.title_en},
    }


@router.post("/orders")
def create_order(body: BuyIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    enforce("orders", f"order:{user.id}", 10, 60)
    plan = session.exec(select(Plan).where(Plan.slug == body.plan_slug, Plan.is_active == True)).first()  # noqa: E712
    if plan is None:
        raise ApiError(404, "plan_not_found")
    paid = settings.demo_mode
    order = Order(
        user_id=user.id, plan_id=plan.id, cups=plan.cups, amount_toman=plan.price_toman,
        status="paid" if paid else "pending",
    )
    session.add(order)
    session.flush()
    if paid:
        session.add(CreditBatch(
            user_id=user.id, order_id=order.id, cups_total=plan.cups,
            expires_at=utcnow() + timedelta(days=plan.validity_days),
        ))
    # Outside DEMO_MODE nothing is credited here. The payment gateway callback must, after
    # verifying signature, order id and amount: flip the order pending -> paid with a conditional
    # UPDATE (WHERE status='pending', check rowcount) and insert the CreditBatch in the same
    # transaction, so a replayed callback credits cups exactly once.
    session.commit()
    audit("order_created", user_id=user.id, order_id=order.id, plan=plan.slug, status=order.status)
    return {**order_dict(order, plan), "payment_required": not paid}


@router.get("/orders")
def list_orders(user: User = Depends(current_user), session: Session = Depends(get_session)):
    rows = session.exec(
        select(Order, Plan).join(Plan, Plan.id == Order.plan_id)
        .where(Order.user_id == user.id).order_by(Order.id.desc()).limit(LIST_LIMIT)
    ).all()
    return [order_dict(o, p) for o, p in rows]


class RedeemIn(BaseModel):
    cafe_slug: Slug | None = None
    drink: Drink = "espresso"


def redemption_dict(r: Redemption, cafe: Cafe | None, now) -> dict:
    # GET handlers never write: an overdue pending code is only reported as expired here;
    # the maintenance job persists the change.
    status = "expired" if r.status == "pending" and r.expires_at <= now else r.status
    return {
        "id": r.id, "code": r.code, "drink": r.drink, "status": status,
        "created_at": iso(r.created_at), "expires_at": iso(r.expires_at),
        "confirmed_at": iso(r.confirmed_at),
        "cafe": {"slug": cafe.slug, "fa": cafe.name_fa, "en": cafe.name_en} if cafe else None,
        "qr_payload": f"cups://redeem/{r.code}",
    }


@router.post("/redemptions")
def create_redemption(body: RedeemIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    enforce("redemptions", f"redeem:{user.id}", 10, 60)
    now = utcnow()
    cafe = None
    if body.cafe_slug:
        cafe = session.exec(select(Cafe).where(Cafe.slug == body.cafe_slug)).first()
        if cafe is None:
            raise ApiError(404, "not_found")
    if session.exec(select(CreditBatch.id).where(*usable_batches(user.id, now)).limit(1)).first() is None:
        raise ApiError(400, "no_cups_left")
    for _ in range(CODE_RETRIES):
        # cancel this user's other pending codes and insert the new one in ONE transaction
        run(
            session,
            update(Redemption).where(Redemption.user_id == user.id, Redemption.status == "pending")
            .values(status="cancelled"),
        )
        red = Redemption(
            user_id=user.id, cafe_id=cafe.id if cafe else None,
            code=f"{secrets.randbelow(10**8):08d}", drink=body.drink,
        )
        session.add(red)
        try:
            session.commit()
            break
        except IntegrityError:  # unique code collision (or a concurrent create): try again
            session.rollback()
    else:
        raise RuntimeError("could not allocate a unique redemption code")
    audit("redemption_created", user_id=user.id, redemption_id=red.id, cafe=body.cafe_slug)
    return redemption_dict(red, cafe, now)


@router.get("/redemptions")
def list_redemptions(user: User = Depends(current_user), session: Session = Depends(get_session)):
    now = utcnow()
    rows = session.exec(
        select(Redemption, Cafe).join(Cafe, Cafe.id == Redemption.cafe_id, isouter=True)
        .where(Redemption.user_id == user.id).order_by(Redemption.id.desc()).limit(LIST_LIMIT)
    ).all()
    return [redemption_dict(r, c, now) for r, c in rows]


@router.get("/redemptions/{code}")
def get_redemption(code: str, user: User = Depends(current_user), session: Session = Depends(get_session)):
    row = None
    if len(code) == 8 and code.isascii() and code.isdecimal():
        row = session.exec(
            select(Redemption, Cafe).join(Cafe, Cafe.id == Redemption.cafe_id, isouter=True)
            .where(Redemption.code == code, Redemption.user_id == user.id)
        ).first()
    if row is None:
        raise ApiError(404, "not_found")
    return redemption_dict(row[0], row[1], utcnow())
