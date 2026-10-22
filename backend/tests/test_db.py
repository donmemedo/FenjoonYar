import logging
import shutil
import sqlite3
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth import create_token
from app.db import engine, ensure_schema, get_session, init_db
from app.main import app
from app.models import Cafe, CreditBatch, OtpCode, Redemption, User, utcnow
from app.seed import seed
from tests.consts import CSRF

# The first release's schema, verbatim: no token_version, no otpcode.attempts / created_at, plain code index.
LEGACY_SCHEMA = """
CREATE TABLE cafe (id INTEGER NOT NULL, slug VARCHAR NOT NULL, name_fa VARCHAR NOT NULL, name_en VARCHAR NOT NULL,
  city_fa VARCHAR NOT NULL, city_en VARCHAR NOT NULL, area_fa VARCHAR NOT NULL, area_en VARCHAR NOT NULL,
  address_fa VARCHAR NOT NULL, address_en VARCHAR NOT NULL, lat FLOAT NOT NULL, lng FLOAT NOT NULL,
  rating FLOAT NOT NULL, cover VARCHAR NOT NULL, tags VARCHAR NOT NULL, is_active BOOLEAN NOT NULL, PRIMARY KEY (id));
CREATE UNIQUE INDEX ix_cafe_slug ON cafe (slug);
CREATE TABLE "plan" (id INTEGER NOT NULL, slug VARCHAR NOT NULL, kind VARCHAR NOT NULL, title_fa VARCHAR NOT NULL,
  title_en VARCHAR NOT NULL, subtitle_fa VARCHAR NOT NULL, subtitle_en VARCHAR NOT NULL, cups INTEGER NOT NULL,
  price_toman INTEGER NOT NULL, list_price_toman INTEGER NOT NULL, validity_days INTEGER NOT NULL,
  popular BOOLEAN NOT NULL, is_active BOOLEAN NOT NULL, PRIMARY KEY (id));
CREATE UNIQUE INDEX ix_plan_slug ON "plan" (slug);
CREATE TABLE user (id INTEGER NOT NULL, phone VARCHAR NOT NULL, name VARCHAR, email VARCHAR, role VARCHAR NOT NULL,
  cafe_id INTEGER, created_at DATETIME NOT NULL, PRIMARY KEY (id), FOREIGN KEY(cafe_id) REFERENCES cafe (id));
CREATE UNIQUE INDEX ix_user_phone ON user (phone);
CREATE TABLE otpcode (id INTEGER NOT NULL, phone VARCHAR NOT NULL, code VARCHAR NOT NULL, expires_at DATETIME NOT NULL,
  used BOOLEAN NOT NULL, PRIMARY KEY (id));
CREATE INDEX ix_otpcode_phone ON otpcode (phone);
CREATE TABLE "order" (id INTEGER NOT NULL, user_id INTEGER NOT NULL, plan_id INTEGER NOT NULL, cups INTEGER NOT NULL,
  amount_toman INTEGER NOT NULL, status VARCHAR NOT NULL, created_at DATETIME NOT NULL, PRIMARY KEY (id),
  FOREIGN KEY(user_id) REFERENCES user (id), FOREIGN KEY(plan_id) REFERENCES "plan" (id));
CREATE INDEX ix_order_user_id ON "order" (user_id);
CREATE TABLE redemption (id INTEGER NOT NULL, user_id INTEGER NOT NULL, cafe_id INTEGER, code VARCHAR NOT NULL,
  drink VARCHAR NOT NULL, status VARCHAR NOT NULL, created_at DATETIME NOT NULL, expires_at DATETIME NOT NULL,
  confirmed_at DATETIME, settle_toman INTEGER NOT NULL, PRIMARY KEY (id),
  FOREIGN KEY(user_id) REFERENCES user (id), FOREIGN KEY(cafe_id) REFERENCES cafe (id));
CREATE INDEX ix_redemption_user_id ON redemption (user_id);
CREATE INDEX ix_redemption_code ON redemption (code);
CREATE TABLE creditbatch (id INTEGER NOT NULL, user_id INTEGER NOT NULL, order_id INTEGER NOT NULL,
  cups_total INTEGER NOT NULL, cups_used INTEGER NOT NULL, expires_at DATETIME NOT NULL, PRIMARY KEY (id),
  FOREIGN KEY(user_id) REFERENCES user (id), FOREIGN KEY(order_id) REFERENCES "order" (id));
CREATE INDEX ix_creditbatch_user_id ON creditbatch (user_id);
"""
LEGACY_ROWS = """
INSERT INTO "plan" VALUES (1,'taste-5','package','a','b','c','d',5,480000,600000,90,0,1);
INSERT INTO user VALUES (1,'09121234567','Old Customer',NULL,'customer',NULL,'2025-01-01 10:00:00.000000');
INSERT INTO "order" VALUES (1,1,1,5,480000,'paid','2025-01-01 10:00:00.000000');
INSERT INTO creditbatch VALUES (1,1,1,5,1,'2099-01-01 00:00:00.000000');
INSERT INTO otpcode VALUES (1,'09121234567','1234','2025-01-01 10:03:00.000000',1);
INSERT INTO redemption VALUES (1,1,NULL,'123456','latte','confirmed','2025-01-01 10:00:00.000000','2025-01-01 10:10:00.000000','2025-01-01 10:01:00.000000',64080);
"""
REAL_DB = Path(__file__).resolve().parents[1] / "data" / "cups.db"


def legacy_engine(tmp_path, dup_codes=False):
    path = tmp_path / "legacy.db"
    con = sqlite3.connect(path)
    con.executescript(LEGACY_SCHEMA + LEGACY_ROWS)
    if dup_codes:  # the 6-digit generator could collide: legacy data may break a unique index
        con.execute("INSERT INTO redemption VALUES (2,1,NULL,'123456','cold','expired','2025-02-01 10:00:00.000000','2025-02-01 10:10:00.000000',NULL,0)")
    con.commit()
    con.close()
    return create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})


def index_names(eng):
    with eng.connect() as c:
        return {r[0] for r in c.execute(text("SELECT name FROM sqlite_master WHERE type='index'"))}


def columns(eng, table):
    return {c["name"] for c in inspect(eng).get_columns(table)}


def test_sqlite_pragmas_are_set_on_every_connection():
    for _ in range(3):  # fresh pooled connections too
        with engine.connect() as c:
            pragma = lambda name: c.execute(text(f"PRAGMA {name}")).scalar()  # noqa: E731
            assert pragma("journal_mode") == "wal"
            assert pragma("synchronous") == 1  # NORMAL
            assert pragma("busy_timeout") == 5000
            assert pragma("foreign_keys") == 1
            assert pragma("cache_size") == -20000  # 20 MB, the default is 2 MB


def test_foreign_keys_are_enforced(db):
    db.add(Redemption(user_id=999_999, code="99999999"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_composite_and_unique_indexes_exist():
    names = index_names(engine)
    assert {
        "ix_redemption_cafe_status_confirmed", "ix_redemption_user_id_id", "ix_redemption_status_expires",
        "ix_creditbatch_user_expires", "ix_order_user_id_id", "ix_otpcode_phone_used_id",
        "uq_redemption_code", "uq_redemption_one_pending",
    } <= names
    assert not names & {"ix_otpcode_phone", "ix_redemption_user_id", "ix_creditbatch_user_id", "ix_order_user_id", "ix_redemption_code"}


def test_hot_queries_use_their_indexes():
    plans = {
        "SELECT * FROM redemption WHERE cafe_id=1 AND status='confirmed' AND confirmed_at>'2020'": "ix_redemption_cafe_status_confirmed",
        "SELECT * FROM redemption WHERE status='pending' AND expires_at<'2020'": "ix_redemption_status_expires",
        "SELECT * FROM creditbatch WHERE user_id=1 AND expires_at>'2020'": "ix_creditbatch_user_expires",
        "SELECT * FROM otpcode WHERE phone='09121234567' AND used=0 ORDER BY id DESC LIMIT 1": "ix_otpcode_phone_used_id",
        "SELECT * FROM redemption WHERE code='12345678'": "uq_redemption_code",
        'SELECT * FROM "order" WHERE user_id=1 ORDER BY id DESC LIMIT 100': "ix_order_user_id_id",
    }
    with engine.connect() as c:
        for sql, index in plans.items():
            detail = " ".join(r[3] for r in c.execute(text("EXPLAIN QUERY PLAN " + sql)))
            assert index in detail, (sql, detail)


def test_ensure_schema_is_idempotent():
    before = index_names(engine)
    ensure_schema()
    ensure_schema()
    assert index_names(engine) == before


def test_upgrade_of_a_legacy_database(tmp_path):
    eng = legacy_engine(tmp_path)
    init_db(eng)
    assert "token_version" in columns(eng, "user") and {"attempts", "created_at"} <= columns(eng, "otpcode")
    names = index_names(eng)
    assert {"uq_redemption_code", "uq_redemption_one_pending", "ix_otpcode_phone_used_id"} <= names
    assert not names & {"ix_redemption_code", "ix_otpcode_phone", "ix_redemption_user_id"}
    with Session(eng) as s:  # old rows read back through the new models
        user = s.exec(select(User)).one()
        assert (user.name, user.token_version) == ("Old Customer", 0)
        assert s.exec(select(OtpCode)).one().attempts == 0
        assert s.exec(select(CreditBatch)).one().cups_used == 1
        assert s.exec(select(Redemption)).one().code == "123456"
    init_db(eng)  # second start: nothing changes, nothing breaks
    assert index_names(eng) == names


def test_upgrade_tolerates_legacy_duplicate_codes(tmp_path, caplog):
    eng = legacy_engine(tmp_path, dup_codes=True)
    caplog.set_level(logging.WARNING, logger="cups.db")
    init_db(eng)
    names = index_names(eng)
    assert "uq_redemption_code" not in names and "ix_redemption_code" in names  # lookups stay indexed
    assert any("uq_redemption_code" in r.getMessage() for r in caplog.records)
    with eng.begin() as c:
        c.execute(text("DELETE FROM redemption WHERE id=2"))
    init_db(eng)  # fixed by hand, restarted: the unique index appears and the plain one goes
    names = index_names(eng)
    assert "uq_redemption_code" in names and "ix_redemption_code" not in names


def serve_from(eng):
    def override():
        with Session(eng, expire_on_commit=False) as s:
            yield s

    app.dependency_overrides[get_session] = override
    return TestClient(app)


def run_flow_on(eng):
    """The whole customer -> partner flow against an upgraded database."""
    with Session(eng, expire_on_commit=False) as s:
        seed(s, demo=False)
        customer = s.exec(select(User).where(User.role == "customer")).first()
        cafe = s.exec(select(Cafe).where(Cafe.slug == "noghte")).one()
        partner = User(phone="09128888888", role="partner", cafe_id=cafe.id)
        s.add(partner)
        s.commit()
        order_id = s.exec(select(CreditBatch.order_id)).first()
        s.add(CreditBatch(user_id=customer.id, order_id=order_id, cups_total=2, expires_at=utcnow() + timedelta(days=30)))
        s.commit()
        ch = {"Authorization": f"Bearer {create_token(customer)}"}
        ph = {"Authorization": f"Bearer {create_token(partner)}"}
        customer_id = customer.id
    c = serve_from(eng)
    try:
        assert c.get("/api/auth/me", headers=ch).json()["id"] == customer_id
        assert c.get("/api/wallet", headers=ch).json()["cups_remaining"] >= 2
        code = c.post("/api/redemptions", json={"drink": "latte"}, headers=ch).json()["code"]
        assert len(code) == 8
        assert c.post("/api/partner/redemptions/confirm", json={"code": code}, headers=ph).status_code == 200
        assert c.get("/api/partner/summary", headers=ph).json()["today_cups"] == 1
        assert c.post("/api/auth/logout", headers={**ch, **CSRF}).status_code == 204
        assert c.get("/api/auth/me", headers=ch).status_code == 401  # token_version column works
    finally:
        app.dependency_overrides.clear()


def test_the_app_runs_on_an_upgraded_legacy_database(tmp_path):
    eng = legacy_engine(tmp_path)
    init_db(eng)
    run_flow_on(eng)


@pytest.mark.skipif(not REAL_DB.exists(), reason="backend/data/cups.db is git-ignored and absent here")
def test_a_copy_of_the_real_demo_database_upgrades_and_serves(tmp_path):
    copy = tmp_path / "cups.db"
    shutil.copy(REAL_DB, copy)
    eng = create_engine(f"sqlite:///{copy}", connect_args={"check_same_thread": False})
    init_db(eng)
    assert "token_version" in columns(eng, "user") and "attempts" in columns(eng, "otpcode")
    assert "uq_redemption_code" in index_names(eng)
    with Session(eng) as s:
        assert s.exec(select(Cafe)).first() and s.exec(select(User)).first()
    run_flow_on(eng)
