"""Test harness: one temp SQLite file per session, strong random secrets, rows cleaned per test.

The environment is set BEFORE the app is imported, because settings and the engine are built at import.
"""
import os
import secrets
import shutil
import tempfile
from datetime import timedelta

_TMP = tempfile.mkdtemp(prefix="cups-tests-")
os.environ.update(
    ENV="test", JWT_SECRET=secrets.token_urlsafe(48), DEMO_MODE="0", COOKIE_SECURE="0", TRUSTED_PROXIES="0",
    JWT_TTL_HOURS="24", CORS_ORIGINS="http://localhost:3044", DATABASE_URL=f"sqlite:///{_TMP}/test.db",
)

import pytest  # noqa: E402
from sqlalchemy import event  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import Session, delete, select  # noqa: E402

from app.auth import create_token  # noqa: E402
from app.config import settings  # noqa: E402
from app.db import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Cafe, CreditBatch, Order, OtpCode, Plan, Redemption, User, utcnow  # noqa: E402
from app.ratelimit import limiter  # noqa: E402
from app.routers.auth import code_hash  # noqa: E402
from app.seed import seed  # noqa: E402
from tests.consts import PHONE, PHONE2  # noqa: E402



@pytest.fixture(scope="session", autouse=True)
def _database():
    init_db()
    with Session(engine) as s:
        seed(s, demo=False)
    yield
    engine.dispose()
    shutil.rmtree(_TMP, ignore_errors=True)


class FakeClock:
    """Frozen time for the rate limiter: window tests never depend on how slow the machine is."""

    now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture(autouse=True)
def clock(monkeypatch):
    fake = FakeClock()
    monkeypatch.setattr(limiter, "_clock", fake)
    return fake


@pytest.fixture(autouse=True)
def _clean(clock):
    limiter.reset()
    yield
    with Session(engine) as s:
        for table in (Redemption, CreditBatch, Order, OtpCode, User):
            s.exec(delete(table))
        s.commit()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    with Session(engine) as s:
        yield s


@pytest.fixture
def demo(monkeypatch):
    monkeypatch.setattr(settings, "demo_mode", True)


@pytest.fixture
def make_user(db):
    def make(phone=PHONE, role="customer", cafe=None):
        cafe_id = db.exec(select(Cafe.id).where(Cafe.slug == cafe)).one() if cafe else None
        user = User(phone=phone, role=role, cafe_id=cafe_id, name="Test")
        db.add(user)
        db.commit()
        return user
    return make


@pytest.fixture
def bearer():
    return lambda user: {"Authorization": f"Bearer {create_token(user)}"}


@pytest.fixture
def give_cups(db):
    """Insert a paid order plus a credit batch directly."""
    def give(user, cups=5, days=90, used=0):
        plan = db.exec(select(Plan).where(Plan.slug == "taste-5")).one()
        order = Order(user_id=user.id, plan_id=plan.id, cups=cups, amount_toman=1, status="paid")
        db.add(order)
        db.flush()
        batch = CreditBatch(
            user_id=user.id, order_id=order.id, cups_total=cups, cups_used=used,
            expires_at=utcnow() + timedelta(days=days),
        )
        db.add(batch)
        db.commit()
        return batch
    return give


@pytest.fixture
def customer(make_user, give_cups, bearer):
    """A customer with 5 cups and bearer headers."""
    user = make_user()
    give_cups(user, 5)
    return user, bearer(user)


@pytest.fixture
def partner(make_user, bearer):
    user = make_user(PHONE2, role="partner", cafe="noghte")
    return user, bearer(user)


@pytest.fixture
def q():
    """Run a select in a fresh session (no stale identity map) and return all rows."""
    def run(stmt):
        with Session(engine) as s:
            return s.exec(stmt).all()
    return run


@pytest.fixture
def upd():
    """Run a bulk UPDATE/DELETE in its own transaction."""
    def run(stmt):
        with Session(engine) as s:
            s.exec(stmt)
            s.commit()
    return run


@pytest.fixture
def plant_code(db):
    """Insert a login code with a known value. `age` shifts created_at into the past (seconds)."""
    def plant(phone=PHONE, code="123456", age=0, ttl=180, used=False, attempts=0):
        created = utcnow() - timedelta(seconds=age)
        row = OtpCode(
            phone=phone, code=code_hash(phone, code), created_at=created,
            expires_at=created + timedelta(seconds=ttl), used=used, attempts=attempts,
        )
        db.add(row)
        db.commit()
        return row
    return plant


@pytest.fixture
def make_redemption(db):
    def make(user, code="12345678", cafe=None, status="pending", expires_in=600, drink="latte"):
        cafe_id = db.exec(select(Cafe.id).where(Cafe.slug == cafe)).one() if cafe else None
        row = Redemption(
            user_id=user.id, cafe_id=cafe_id, code=code, status=status, drink=drink,
            expires_at=utcnow() + timedelta(seconds=expires_in),
        )
        db.add(row)
        db.commit()
        return row
    return make


@pytest.fixture
def sql_log():
    """Every SQL statement the app engine executes while the test runs."""
    seen: list[str] = []

    def spy(conn, cursor, statement, params, context, executemany):
        seen.append(statement)

    event.listen(engine, "before_cursor_execute", spy)
    yield seen
    event.remove(engine, "before_cursor_execute", spy)

