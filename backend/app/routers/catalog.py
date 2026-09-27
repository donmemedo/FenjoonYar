from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from ..db import get_session
from ..models import Cafe, Plan, Redemption, User

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
def list_plans(kind: str | None = None, session: Session = Depends(get_session)):
    q = select(Plan).where(Plan.is_active == True)  # noqa: E712
    if kind:
        q = q.where(Plan.kind == kind)
    return [plan_dict(p) for p in session.exec(q.order_by(Plan.cups)).all()]


@router.get("/cafes")
def list_cafes(
    city: str | None = None,
    tag: str | None = None,
    q: str | None = None,
    session: Session = Depends(get_session),
):
    stmt = select(Cafe).where(Cafe.is_active == True)  # noqa: E712
    cafes = session.exec(stmt).all()
    if city:
        cafes = [c for c in cafes if city in (c.city_fa, c.city_en)]
    if tag:
        cafes = [c for c in cafes if tag in c.tags.split(",")]
    if q:
        needle = q.strip().lower()
        cafes = [
            c for c in cafes
            if needle in c.name_fa.lower() or needle in c.name_en.lower()
            or needle in c.area_fa.lower() or needle in c.area_en.lower()
        ]
    return [cafe_dict(c) for c in sorted(cafes, key=lambda c: -c.rating)]


@router.get("/cafes/{slug}")
def get_cafe(slug: str, session: Session = Depends(get_session)):
    c = session.exec(select(Cafe).where(Cafe.slug == slug)).first()
    return cafe_dict(c) if c else {}


@router.get("/stats")
def stats(session: Session = Depends(get_session)):
    cafes = session.exec(select(func.count(Cafe.id))).one()
    users = session.exec(select(func.count(User.id))).one()
    cups = session.exec(
        select(func.count(Redemption.id)).where(Redemption.status == "confirmed")
    ).one()
    cities = len({c.city_en for c in session.exec(select(Cafe)).all()})
    return {
        "cafes": cafes, "cities": cities,
        "members": users + 9_400, "cups_served": cups + 128_500,
    }
