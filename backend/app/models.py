from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.utcnow()


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(index=True, unique=True)
    name: Optional[str] = None
    email: Optional[str] = None
    role: str = Field(default="customer")  # customer | partner | admin
    cafe_id: Optional[int] = Field(default=None, foreign_key="cafe.id")
    created_at: datetime = Field(default_factory=utcnow)


class OtpCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(index=True)
    code: str
    expires_at: datetime
    used: bool = False


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
    user_id: int = Field(foreign_key="user.id", index=True)
    plan_id: int = Field(foreign_key="plan.id")
    cups: int = 0
    amount_toman: int = 0
    status: str = "paid"  # pending | paid | failed
    created_at: datetime = Field(default_factory=utcnow)


class CreditBatch(SQLModel, table=True):
    """Cups bought in one order. Cups expire after the plan validity window."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    order_id: int = Field(foreign_key="order.id")
    cups_total: int = 0
    cups_used: int = 0
    expires_at: datetime = Field(
        default_factory=lambda: utcnow() + timedelta(days=90)
    )


class Redemption(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    cafe_id: Optional[int] = Field(default=None, foreign_key="cafe.id")
    code: str = Field(index=True)
    drink: str = "espresso"
    status: str = "pending"  # pending | confirmed | expired | cancelled
    created_at: datetime = Field(default_factory=utcnow)
    expires_at: datetime = Field(
        default_factory=lambda: utcnow() + timedelta(minutes=10)
    )
    confirmed_at: Optional[datetime] = None
    settle_toman: int = 0
