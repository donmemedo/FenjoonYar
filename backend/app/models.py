from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import NaiveDatetime
from sqlmodel import Field, SQLModel

# All timestamps are naive UTC. sqlmodel 0.0.47 refuses naive datetimes unless the field is
# annotated NaiveDatetime, so every datetime column below uses that annotation.
# Composite indexes live in db.ensure_schema() so fresh and upgraded databases get the same set.


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() + "Z" if dt else None


def _in(**kw) -> Callable[[], datetime]:
    return lambda: utcnow() + timedelta(**kw)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(index=True, unique=True)
    name: Optional[str] = None
    email: Optional[str] = None
    role: str = Field(default="customer")  # customer | partner | admin
    cafe_id: Optional[int] = Field(default=None, foreign_key="cafe.id")
    token_version: int = 0  # bumped on logout: every older JWT dies
    created_at: NaiveDatetime = Field(default_factory=utcnow)


class OtpCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str
    # HMAC-SHA256(jwt_secret, phone + ":" + code) as hex. Never the plain code.
    # (Column keeps its legacy name so old databases upgrade in place.)
    code: str
    expires_at: NaiveDatetime
    used: bool = False
    attempts: int = 0
    created_at: NaiveDatetime = Field(default_factory=utcnow)


class Cafe(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    name_fa: str
    name_en: str
    city_fa: str
    city_en: str
    area_fa: str
    area_en: str
    address_fa: str = ""
    address_en: str = ""
    lat: float = 35.7
    lng: float = 51.4
    rating: float = 4.6
    cover: str = "beans"
    tags: str = ""  # comma separated keys: specialty,brunch,workspace,late,vegan
    is_active: bool = True


class Plan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    kind: str = "package"  # package | subscription | corporate
    title_fa: str
    title_en: str
    subtitle_fa: str = ""
    subtitle_en: str = ""
    cups: int = 5
    price_toman: int = 0  # real price in toman
    list_price_toman: int = 0  # price without CUPS discount
    validity_days: int = 90
    popular: bool = False
    is_active: bool = True


class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    plan_id: int = Field(foreign_key="plan.id")
    cups: int = 0
    amount_toman: int = 0
    status: str = "pending"  # pending | paid | failed
    created_at: NaiveDatetime = Field(default_factory=utcnow)


class CreditBatch(SQLModel, table=True):
    """Cups bought in one order. Cups expire after the plan validity window."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    order_id: int = Field(foreign_key="order.id")
    cups_total: int = 0
    cups_used: int = 0
    expires_at: NaiveDatetime = Field(default_factory=_in(days=90))


class Redemption(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    cafe_id: Optional[int] = Field(default=None, foreign_key="cafe.id")
    code: str  # 8 digits, UNIQUE (uq_redemption_code)
    drink: str = "espresso"
    status: str = "pending"  # pending | confirmed | expired | cancelled
    created_at: NaiveDatetime = Field(default_factory=utcnow)
    expires_at: NaiveDatetime = Field(default_factory=_in(minutes=10))
    confirmed_at: Optional[NaiveDatetime] = None
    settle_toman: int = 0
