from sqlmodel import func, select

from app.models import CreditBatch, Order, Redemption, User
from tests.consts import writes


def test_empty_wallet(client, make_user, bearer):
    w = client.get("/api/wallet", headers=bearer(make_user())).json()
    assert w == {"cups_remaining": 0, "cups_used": 0, "cups_expired": 0, "total_bought": 0,
                 "expiring_soon": 0, "next_expiry": None, "batches": []}


def test_wallet_math_with_an_expired_batch(client, make_user, give_cups, bearer):
    user = make_user()
    active = give_cups(user, 5, days=10, used=2)  # 3 left, expires inside 14 days
    give_cups(user, 4, days=-1, used=1)  # expired: 3 unused cups are lost, 1 was really drunk
    give_cups(user, 3, days=30, used=3)  # exhausted
    give_cups(user, 6, days=40)  # 6 left, not expiring soon
    w = client.get("/api/wallet", headers=bearer(user)).json()
    assert w["total_bought"] == 18
    assert w["cups_used"] == 6  # 2 + 1 + 3 + 0: the sum over ALL batches
    assert w["cups_expired"] == 3  # unused part of the expired batch only
    assert w["cups_remaining"] == 9  # 3 + 6, active batches only
    assert w["expiring_soon"] == 3
    assert [b["remaining"] for b in w["batches"]] == [3, 6]  # exhausted and expired batches are hidden
    assert w["batches"][0]["id"] == active.id and set(w["batches"][0]) == {"id", "remaining", "total", "expires_at"}
    assert w["next_expiry"] == w["batches"][0]["expires_at"] and w["next_expiry"].endswith("Z")
    assert w["cups_used"] + w["cups_expired"] + w["cups_remaining"] == w["total_bought"]


def test_wallet_is_per_user(client, customer, make_user, give_cups, bearer):
    other = make_user("09120000009")
    give_cups(other, 7)
    assert client.get("/api/wallet", headers=customer[1]).json()["total_bought"] == 5


def test_wallet_uses_a_single_aggregate_query_for_the_totals(client, customer, sql_log):
    sql_log.clear()
    client.get("/api/wallet", headers=customer[1])
    selects = [s for s in sql_log if s.lstrip().upper().startswith("SELECT")]
    assert sum("sum(" in s.lower() for s in selects) == 1


def test_get_handlers_never_write(client, customer, partner, make_redemption, sql_log, q):
    user, h = customer
    make_redemption(user, code="12345678", expires_in=-60)  # overdue pending: tempting to "fix" on read
    counts = lambda: [q(select(func.count(t.id)))[0] for t in (User, Order, CreditBatch, Redemption)]  # noqa: E731
    statuses = lambda: [r.status for r in q(select(Redemption))]  # noqa: E731
    before = (counts(), statuses())
    sql_log.clear()
    for path, headers in (
        ("/api/auth/me", h), ("/api/wallet", h), ("/api/orders", h), ("/api/redemptions", h),
        ("/api/redemptions/12345678", h), ("/api/partner/summary", partner[1]),
        ("/api/plans", {}), ("/api/cafes", {}), ("/api/cafes/noghte", {}), ("/api/stats", {}),
        ("/api/health", {}), ("/api/ready", {}),
    ):
        assert client.get(path, headers=headers).status_code == 200, path
    assert writes(sql_log) == []
    assert (counts(), statuses()) == before
