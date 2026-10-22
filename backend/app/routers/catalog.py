from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import false, literal
from sqlmodel import Session, col, func, or_, select

from ..db import get_session
from ..errors import ApiError
from ..models import Cafe, Plan, Redemption, User
from ..schemas import PlanKind

router = APIRouter(prefix="/api", tags=["catalog"])


def plan_dict(p: Plan) -> dict:
    return {
        "id": p.id, "slug": p.slug, "kind": p.kind,
        "title": {"fa": p.title_fa, "en": p.title_en},
        "subtitle": {"fa": p.subtitle_fa, "en": p.subtitle_en},
        "cups": p.cups, "price": p.price_toman, "list_price": p.list_price_toman,
        "per_cup": round(p.price_toman / p.cups) if p.cups else 0,
        "saving_percent": round(
            (1 - p.price_toman / p.list_price_toman) * 100
        ) if p.list_price_toman else 0,
        "validity_days": p.validity_days, "popular": p.popular,
    }


def cafe_dict(c: Cafe) -> dict:
    return {
        "id": c.id, "slug": c.slug,
        "name": {"fa": c.name_fa, "en": c.name_en},
        "city": {"fa": c.city_fa, "en": c.city_en},
        "area": {"fa": c.area_fa, "en": c.area_en},
        "address": {"fa": c.address_fa, "en": c.address_en},
        "lat": c.lat, "lng": c.lng, "rating": c.rating, "cover": c.cover,
        "tags": [t for t in c.tags.split(",") if t],
    }


@router.get("/plans")
def list_plans(kind: PlanKind | None = None, session: Session = Depends(get_session)):
    q = select(Plan).where(Plan.is_active == True)  # noqa: E712
    if kind:
        q = q.where(Plan.kind == kind)
    return [plan_dict(p) for p in session.exec(q.order_by(Plan.cups)).all()]


@router.get("/cafes")
def list_cafes(
    city: str | None = Query(None, max_length=40),
    tag: str | None = Query(None, max_length=40),
    q: str | None = Query(None, max_length=64),
    session: Session = Depends(get_session),
):
    stmt = select(Cafe).where(Cafe.is_active == True)  # noqa: E712
    if city:
        stmt = stmt.where(or_(Cafe.city_fa == city, Cafe.city_en == city))
    if tag:
        # tags is a comma separated column: match a whole key between commas ("a,b" is no key)
        whole = (literal(",") + Cafe.tags + literal(",")).contains(f",{tag},", autoescape=True)
        stmt = stmt.where(false() if "," in tag else whole)
    if q and q.strip():
        needle = q.strip()
        stmt = stmt.where(or_(*(col(c).icontains(needle, autoescape=True)
                                for c in (Cafe.name_fa, Cafe.name_en, Cafe.area_fa, Cafe.area_en))))
    return [cafe_dict(c) for c in session.exec(stmt.order_by(Cafe.rating.desc(), Cafe.id)).all()]


@router.get("/cafes/{slug}")
def get_cafe(slug: str = Path(max_length=40), session: Session = Depends(get_session)):
    c = session.exec(select(Cafe).where(Cafe.slug == slug)).first()
    if c is None:
        raise ApiError(404, "not_found")
    return cafe_dict(c)


@router.get("/stats")
def stats(session: Session = Depends(get_session)):
    """Real counts only (no marketing offsets)."""
    active = Cafe.is_active == True  # noqa: E712
    cafes, cities, members, cups = session.exec(
        select(
            select(func.count(Cafe.id)).where(active).scalar_subquery(),
            select(func.count(func.distinct(Cafe.city_en))).where(active).scalar_subquery(),
            select(func.count(User.id)).where(User.role == "customer").scalar_subquery(),
            select(func.count(Redemption.id)).where(Redemption.status == "confirmed").scalar_subquery(),
        )
    ).one()
    return {"cafes": cafes, "cities": cities, "members": members, "cups_served": cups}
