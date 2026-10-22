import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlmodel import select, update

from app import jobs
from app.main import app
from app.models import OtpCode, Redemption, User
from app.ratelimit import limiter
from app.seed import seed


def test_maintenance_expires_overdue_pending_codes_only(customer, make_redemption, make_user, q):
    make_redemption(customer[0], code="11111111", expires_in=-30)
    live = make_redemption(make_user("09120000009"), code="22222222", expires_in=300)
    done = make_redemption(make_user("09120000008"), code="33333333", status="confirmed", expires_in=-30)
    stats = jobs.run_maintenance()
    assert stats["redemptions_expired"] == 1
    assert {r.code: r.status for r in q(select(Redemption))} == {"11111111": "expired", "22222222": "pending", "33333333": "confirmed"}
    assert (live.status, done.status) == ("pending", "confirmed")


def test_maintenance_purges_old_dead_login_codes(plant_code, q):
    plant_code("09120000001", age=2 * 3600, used=True)  # old and used
    plant_code("09120000002", age=2 * 3600)  # old and expired
    plant_code("09120000003", age=600, used=True)  # used but recent: the resend cooldown still needs it
    plant_code("09120000004", age=30)  # live
    plant_code("09120000005", age=3 * 3600, ttl=10 * 3600)  # old but somehow still valid: kept
    assert jobs.run_maintenance()["otp_purged"] == 2
    assert {r.phone[-1] for r in q(select(OtpCode))} == {"3", "4", "5"}


def test_maintenance_trims_the_rate_limiter(clock):
    limiter.record("stale", 10)
    limiter.record("fresh", 3600)
    clock.now += 11
    assert jobs.run_maintenance()["limiter_trimmed"] == 1
    assert len(limiter) == 1


def test_maintenance_is_idempotent(customer, make_redemption):
    make_redemption(customer[0], expires_in=-30)
    jobs.run_maintenance()
    assert jobs.run_maintenance() == {"redemptions_expired": 0, "otp_purged": 0, "limiter_trimmed": 0}


def test_loop_runs_survives_a_failing_tick_and_cancels_cleanly(monkeypatch):
    ticks = []

    def flaky():
        ticks.append(1)
        if len(ticks) == 1:
            raise RuntimeError("database is locked")
        return {"redemptions_expired": 0, "otp_purged": 0, "limiter_trimmed": 0}

    monkeypatch.setattr(jobs, "run_maintenance", flaky)

    async def scenario():
        task = asyncio.create_task(jobs.maintenance_loop(interval=0.01))
        for _ in range(200):
            if len(ticks) >= 3:
                break
            await asyncio.sleep(0.01)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        return len(ticks)

    assert asyncio.run(scenario()) >= 3  # the first tick raised and the loop carried on


def test_lifespan_starts_the_job_and_cancels_it_on_shutdown(monkeypatch, q):
    log = []

    async def spy(interval=jobs.INTERVAL_SECONDS):
        log.append(("started", interval))
        try:
            await asyncio.sleep(3600)
        except asyncio.CancelledError:
            log.append("cancelled")
            raise

    monkeypatch.setattr("app.main.maintenance_loop", spy)
    with TestClient(app) as c:  # runs startup and shutdown
        assert c.get("/api/health").status_code == 200
        assert log == [("started", 60)]
    assert log == [("started", 60), "cancelled"]
    assert q(select(User)) == []  # DEMO_MODE=0: no demo partner is seeded at startup


def test_demo_partner_is_seeded_only_in_demo_mode(db):
    seed(db, demo=False)
    assert db.exec(select(User).where(User.phone == "09120000000")).first() is None
    seed(db, demo=True)
    seed(db, demo=True)  # idempotent
    (partner,) = db.exec(select(User).where(User.phone == "09120000000")).all()
    assert partner.role == "partner" and partner.cafe_id is not None
    db.exec(update(User).where(User.id == partner.id).values(role="customer"))
    db.commit()


def test_a_legacy_demo_partner_is_demoted_when_demo_mode_is_off(db):
    seed(db, demo=True)
    seed(db, demo=False)  # an old database: the first release seeded this partner everywhere
    (user,) = db.exec(select(User).where(User.phone == "09120000000")).all()
    assert (user.role, user.cafe_id) == ("customer", None)
    seed(db, demo=True)  # demo again: the account is a partner of noghte once more
    db.refresh(user)
    assert user.role == "partner" and user.cafe_id is not None
