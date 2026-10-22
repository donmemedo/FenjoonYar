from sqlmodel import func, select, update

from app.models import CreditBatch, Order, Plan
from tests.consts import CSRF, PHONE

ORD = "/api/orders"


def test_inactive_plan_is_rejected(client, customer, upd, q):
    _, h = customer
    before = q(select(func.count(Order.id)))
    upd(update(Plan).where(Plan.slug == "regular-10").values(is_active=False))
    try:
        r = client.post(ORD, json={"plan_slug": "regular-10"}, headers=h)
        assert (r.status_code, r.json()) == (404, {"detail": "plan_not_found"})
        assert "regular-10" not in {p["slug"] for p in client.get("/api/plans").json()}
    finally:
        upd(update(Plan).where(Plan.slug == "regular-10").values(is_active=True))
    assert q(select(func.count(Order.id))) == before


def test_unknown_plan_is_404(client, customer):
    _, h = customer
    assert client.post(ORD, json={"plan_slug": "nope"}, headers=h).json() == {"detail": "plan_not_found"}


def test_order_is_pending_and_credits_nothing_outside_demo_mode(client, make_user, bearer, q):
    user = make_user()
    r = client.post(ORD, json={"plan_slug": "taste-5"}, headers=bearer(user))
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "pending" and body["payment_required"] is True
    assert set(body) == {"id", "cups", "amount", "status", "created_at", "plan", "payment_required"}
    assert q(select(func.count(CreditBatch.id))) == [0]
    w = client.get("/api/wallet", headers=bearer(user)).json()
    assert (w["cups_remaining"], w["total_bought"]) == (0, 0)


def test_demo_mode_order_is_paid_and_credits_a_batch(client, demo, make_user, bearer, q):
    user = make_user()
    r = client.post(ORD, json={"plan_slug": "taste-5"}, headers=bearer(user))
    body = r.json()
    assert body["status"] == "paid" and body["payment_required"] is False and body["cups"] == 5
    (batch,) = q(select(CreditBatch))
    assert (batch.user_id, batch.cups_total, batch.cups_used, batch.order_id) == (user.id, 5, 0, body["id"])
    assert client.get("/api/wallet", headers=bearer(user)).json()["cups_remaining"] == 5


def test_orders_are_listed_per_user_newest_first(client, demo, make_user, bearer):
    a, b = make_user(), make_user(PHONE[:-1] + "0")
    client.post(ORD, json={"plan_slug": "taste-5"}, headers=bearer(a))
    client.post(ORD, json={"plan_slug": "regular-10"}, headers=bearer(a))
    client.post(ORD, json={"plan_slug": "ritual-20"}, headers=bearer(b))
    mine = client.get(ORD, headers=bearer(a)).json()
    assert [o["plan"]["slug"] for o in mine] == ["regular-10", "taste-5"]
    assert set(mine[0]) == {"id", "cups", "amount", "status", "created_at", "plan"}


def test_plan_slug_is_validated(client, customer):
    _, h = customer
    for bad in ("X" * 41, "Taste-5", "a b", "", "taste_5"):
        assert client.post(ORD, json={"plan_slug": bad}, headers=h).status_code == 422
    assert client.post(ORD, json={}, headers=h).status_code == 422


def test_orders_are_limited_to_ten_per_minute_per_user(client, make_user, bearer):
    a, b = make_user(), make_user(PHONE[:-1] + "0")
    for _ in range(10):
        assert client.post(ORD, json={"plan_slug": "taste-5"}, headers=bearer(a)).status_code == 200
    r = client.post(ORD, json={"plan_slug": "taste-5"}, headers=bearer(a))
    assert (r.status_code, r.json()["detail"]) == (429, "rate_limited") and int(r.headers["retry-after"]) >= 1
    assert client.post(ORD, json={"plan_slug": "taste-5"}, headers=bearer(b)).status_code == 200


def test_order_via_cookie_needs_csrf_header(client, plant_code):
    plant_code(PHONE, "123456")
    client.post("/api/auth/verify-otp", json={"phone": PHONE, "code": "123456"})
    assert client.post(ORD, json={"plan_slug": "taste-5"}).json() == {"detail": "csrf"}
    assert client.post(ORD, json={"plan_slug": "taste-5"}, headers=CSRF).status_code == 200
