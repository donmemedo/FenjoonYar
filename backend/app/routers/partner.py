from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import case
from sqlmodel import Session, col, func, select, update

from ..auth import current_partner
from ..config import settings
from ..db import get_session, run
from ..errors import ApiError
from ..models import Cafe, Redemption, User, iso, utcnow
from ..observability import audit
from ..ratelimit import limiter, too_many
from ..routers.wallet import debit_one_cup
from ..schemas import RedeemCode

router = APIRouter(prefix="/api/partner", tags=["partner"])

FAIL_LIMIT, FAIL_WINDOW = 10, 600  # failed confirms per partner per 10 minutes


class ConfirmIn(BaseModel):
    code: RedeemCode


@router.post("/redemptions/confirm")
def confirm(body: ConfirmIn, partner: User = Depends(current_partner), session: Session = Depends(get_session)):
    # plain values: rollback() expires ORM objects and every later read would re-SELECT
    partner_id, partner_cafe = partner.id, partner.cafe_id
    fail_key = f"confirm-fail:{partner_id}"
    wait = limiter.check(fail_key, FAIL_LIMIT, FAIL_WINDOW)
    if wait:
        audit("partner_confirm", partner_id=partner_id, cafe_id=partner_cafe, result="rate_limited")
        raise too_many("confirm_failures", wait)

    def fail(status: int, code: str, result: str) -> ApiError:
        session.rollback()
        limiter.record(fail_key, FAIL_WINDOW)
        audit("partner_confirm", partner_id=partner_id, cafe_id=partner_cafe, result=result)
        return ApiError(status, code)

    now = utcnow()
    # Step 1, one conditional UPDATE: only a pending, unexpired code that is free or bound to THIS
    # cafe can flip to confirmed. Unknown, used, expired, cancelled and other-cafe codes all look alike.
    row = run(
        session,
        update(Redemption)
        .where(
            Redemption.code == body.code, Redemption.status == "pending", Redemption.expires_at > now,
            col(Redemption.cafe_id).is_(None) | (Redemption.cafe_id == partner_cafe),
        )
        .values(status="confirmed", confirmed_at=now, cafe_id=partner_cafe, settle_toman=settings.settle_toman)
        .returning(Redemption.id, Redemption.user_id, Redemption.drink),
    ).first()
    if row is None:
        raise fail(404, "code_invalid", "code_invalid")
    # Step 2, same transaction: take one cup from the oldest-expiring usable batch.
    if not debit_one_cup(session, row.user_id, now):
        raise fail(400, "no_cups_left", "no_cups_left")  # rollback also un-confirms step 1
    session.commit()
    audit("partner_confirm", partner_id=partner_id, cafe_id=partner_cafe, result="ok", redemption_id=row.id)
    return {
        "ok": True, "code": body.code, "drink": row.drink,
        "settle_toman": settings.settle_toman, "confirmed_at": iso(now),
    }


@router.get("/summary")
def summary(partner: User = Depends(current_partner), session: Session = Depends(get_session)):
    cafe = session.get(Cafe, partner.cafe_id)
    now = utcnow()
    today = datetime(now.year, now.month, now.day)
    week_start = today - timedelta(days=6)  # 7 calendar days including today
    mine = (Redemption.cafe_id == partner.cafe_id, Redemption.status == "confirmed")
    in_week = Redemption.confirmed_at >= week_start

    today_cups, today_settle, week_cups, week_settle, customers = session.exec(
        select(
            func.coalesce(func.sum(case((Redemption.confirmed_at >= today, 1), else_=0)), 0),
            func.coalesce(func.sum(case((Redemption.confirmed_at >= today, Redemption.settle_toman), else_=0)), 0),
            func.count(Redemption.id),
            func.coalesce(func.sum(Redemption.settle_toman), 0),
            func.count(func.distinct(Redemption.user_id)),
        ).where(*mine, in_week)
    ).one()
    per_day = dict(
        session.exec(
            select(func.date(Redemption.confirmed_at), func.count(Redemption.id))
            .where(*mine, in_week).group_by(func.date(Redemption.confirmed_at))
        ).all()
    )
    recent = session.exec(
        select(Redemption.code, Redemption.drink, Redemption.confirmed_at, Redemption.settle_toman)
        .where(*mine).order_by(Redemption.confirmed_at.desc()).limit(12)
    ).all()
    days = [(today - timedelta(days=i)).date().isoformat() for i in range(6, -1, -1)]
    return {
        "cafe": {"slug": cafe.slug, "fa": cafe.name_fa, "en": cafe.name_en} if cafe else None,
        "today_cups": today_cups,
        "today_settle": today_settle,
        "week_cups": week_cups,
        "week_settle": week_settle,
        "unique_customers": customers,
        "pending_settlement": week_settle,
        "chart": [{"day": d, "cups": per_day.get(d, 0)} for d in days],
        "recent": [
            {"code": c, "drink": d, "at": iso(at), "settle": s} for c, d, at, s in recent
        ],
    }
