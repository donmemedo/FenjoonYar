from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlmodel import func, select, update

from app.main import app
from app.models import Cafe, CreditBatch, Redemption, utcnow

CONFIRM = "/api/partner/redemptions/confirm"
INVALID = (404, {"detail": "code_invalid"})


def confirm(client, h, code="12345678"):
    return client.post(CONFIRM, json={"code": code}, headers=h)


def batch_of(q, user):
    return q(select(CreditBatch).where(CreditBatch.user_id == user.id).order_by(CreditBatch.id))


def test_confirm_settles_and_debits_one_cup(client, customer, partner, make_redemption, q):
    user, h = customer
    make_redemption(user, drink="cappuccino")
    r = confirm(client, partner[1])
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"ok", "code", "drink", "settle_toman", "confirmed_at"}
    assert (body["ok"], body["code"], body["drink"], body["settle_toman"]) == (True, "12345678", "cappuccino", 64_080)
    assert body["confirmed_at"].endswith("Z")
    (red,) = q(select(Redemption))
    cafe = q(select(Cafe.id).where(Cafe.slug == "noghte"))[0]
    assert (red.status, red.cafe_id, red.settle_toman) == ("confirmed", cafe, 64_080) and red.confirmed_at
    assert batch_of(q, user)[0].cups_used == 1
    assert client.get("/api/wallet", headers=h).json()["cups_remaining"] == 4


def test_response_carries_no_customer_data(client, customer, partner, make_redemption):
    user, _ = customer
    make_redemption(user)
    r = confirm(client, partner[1])
    assert user.name not in r.text and user.phone not in r.text
    assert not {"customer", "name", "phone"} & set(r.json())


def test_cafe_bound_code_works_only_at_its_own_cafe(client, customer, partner, make_user, bearer, make_redemption, q):
    user, _ = customer
    make_redemption(user, cafe="raj")
    r = confirm(client, partner[1])  # partner of noghte
    assert (r.status_code, r.json()) == INVALID
    assert [x.status for x in q(select(Redemption))] == ["pending"] and batch_of(q, user)[0].cups_used == 0
    raj = make_user("09120000008", role="partner", cafe="raj")
    assert confirm(client, bearer(raj)).status_code == 200


def test_unbound_code_takes_the_confirming_cafe(client, customer, partner, make_redemption, q):
    make_redemption(customer[0])
    assert confirm(client, partner[1]).status_code == 200
    assert q(select(Redemption.cafe_id)) == q(select(Cafe.id).where(Cafe.slug == "noghte"))


@pytest.mark.parametrize("state", ["unknown", "used", "expired", "cancelled", "other_cafe"])
def test_every_invalid_case_is_the_same_404(client, customer, partner, make_redemption, state, q):
    user, _ = customer
    if state == "used":
        make_redemption(user, status="confirmed")
    elif state == "expired":
        make_redemption(user, expires_in=-1)
    elif state == "cancelled":
        make_redemption(user, status="cancelled")
    elif state == "other_cafe":
        make_redemption(user, cafe="khaak")
    r = confirm(client, partner[1])
    assert (r.status_code, r.json()) == INVALID
    assert batch_of(q, user)[0].cups_used == 0


def test_a_confirmed_code_cannot_be_confirmed_twice(client, customer, partner, make_redemption, q):
    make_redemption(customer[0])
    assert confirm(client, partner[1]).status_code == 200
    assert (confirm(client, partner[1]).status_code, confirm(client, partner[1]).json()) == INVALID
    assert batch_of(q, customer[0])[0].cups_used == 1


def test_code_format_is_validated(client, partner):
    for bad in ("123456", "1234567a", "123456789", "۱۲۳۴۵۶۷۸", ""):
        assert confirm(client, partner[1], bad).status_code == 422


def test_no_cups_left_rolls_everything_back(client, make_user, give_cups, partner, make_redemption, bearer, q):
    user = make_user()
    give_cups(user, 3, used=3)
    make_redemption(user)
    r = confirm(client, partner[1])
    assert (r.status_code, r.json()) == (400, {"detail": "no_cups_left"})
    (red,) = q(select(Redemption))
    assert (red.status, red.confirmed_at, red.settle_toman, red.cafe_id) == ("pending", None, 0, None)


def test_expired_batch_is_never_debited(client, make_user, give_cups, partner, make_redemption, q):
    user = make_user()
    give_cups(user, 5, days=-1)
    make_redemption(user)
    assert confirm(client, partner[1]).json() == {"detail": "no_cups_left"}
    assert batch_of(q, user)[0].cups_used == 0


def test_oldest_expiring_batch_is_debited_first(client, make_user, give_cups, partner, make_redemption, q):
    user = make_user()
    later = give_cups(user, 2, days=60)
    sooner = give_cups(user, 2, days=10)
    make_redemption(user)
    assert confirm(client, partner[1]).status_code == 200
    used = {b.id: b.cups_used for b in batch_of(q, user)}
    assert used == {sooner.id: 1, later.id: 0}


def test_debit_moves_to_the_next_batch_when_one_is_exhausted(client, make_user, give_cups, partner, make_redemption, q):
    user = make_user()
    first = give_cups(user, 1, days=10)
    second = give_cups(user, 1, days=20)
    for code in ("11111111", "22222222"):
        make_redemption(user, code=code)
        assert confirm(client, partner[1], code).status_code == 200
    assert {b.id: b.cups_used for b in batch_of(q, user)} == {first.id: 1, second.id: 1}


def test_concurrent_double_confirm_gives_exactly_one_success(customer, partner, make_redemption, q):
    user, _ = customer
    make_redemption(user)
    gate = Barrier(8)

    def attempt(_):
        c = TestClient(app)
        gate.wait()
        r = confirm(c, partner[1])
        return r.status_code, r.json().get("detail")

    with ThreadPoolExecutor(8) as pool:
        results = list(pool.map(attempt, range(8)))
    assert sorted(r[0] for r in results) == [200] + [404] * 7
    assert {r[1] for r in results if r[0] == 404} == {"code_invalid"}
    (batch,) = batch_of(q, user)
    assert batch.cups_used == 1 <= batch.cups_total
    assert q(select(func.count(Redemption.id)).where(Redemption.status == "confirmed")) == [1]


def test_cups_used_never_exceeds_cups_total_under_concurrent_confirms(make_user, give_cups, bearer, make_redemption, q):
    """One customer with a single cup and an unbound code: two partners confirm at once."""
    user = make_user()
    give_cups(user, 1)
    make_redemption(user)
    p1 = make_user("09120000007", role="partner", cafe="noghte")
    p2 = make_user("09120000006", role="partner", cafe="raj")
    gate = Barrier(2)

    def attempt(p):
        c = TestClient(app)
        gate.wait()
        return confirm(c, bearer(p)).status_code

    with ThreadPoolExecutor(2) as pool:
        codes = sorted(pool.map(attempt, (p1, p2)))
    assert codes == [200, 404]  # exactly one cafe wins the code
    (batch,) = batch_of(q, user)
    assert (batch.cups_used, batch.cups_total) == (1, 1)


def test_failed_confirms_are_limited_per_partner(client, customer, partner, make_user, bearer, make_redemption):
    for i in range(9):
        assert confirm(client, partner[1], f"0000000{i}").status_code == 404
    make_redemption(customer[0], code="55555555")
    assert confirm(client, partner[1], "55555555").status_code == 200  # a success is not a failure
    assert confirm(client, partner[1], "00000009").status_code == 404  # the 10th failure
    r = confirm(client, partner[1], "00000010")
    assert (r.status_code, r.json()["detail"]) == (429, "rate_limited") and int(r.headers["retry-after"]) >= 1
    assert r.json()["retry_after"] == int(r.headers["retry-after"])
    other = make_user("09120000008", role="partner", cafe="raj")
    assert confirm(client, bearer(other), "00000011").status_code == 404  # another partner is unaffected


def test_rate_limited_partner_cannot_confirm_a_valid_code(client, customer, partner, make_redemption, q):
    for i in range(10):
        confirm(client, partner[1], f"0000000{i}")
    make_redemption(customer[0], code="55555555")
    assert confirm(client, partner[1], "55555555").status_code == 429
    assert [x.status for x in q(select(Redemption))] == ["pending"]


def test_no_cups_left_counts_as_a_failure(client, make_user, give_cups, partner, make_redemption):
    user = make_user()
    give_cups(user, 1, used=1)
    make_redemption(user)
    for _ in range(10):
        assert confirm(client, partner[1]).json() == {"detail": "no_cups_left"}
    assert confirm(client, partner[1]).status_code == 429


def test_summary_aggregates_in_sql(client, partner, make_user, give_cups, make_redemption, upd, q):
    noghte = q(select(Cafe.id).where(Cafe.slug == "noghte"))[0]
    users = []
    for i in range(3):
        u = make_user(f"0912000100{i}")
        give_cups(u, 5)
        users.append(u)
    codes = ["10000001", "10000002", "10000003"]
    for u, c in zip(users, codes):
        make_redemption(u, code=c)
        assert confirm(client, partner[1], c).status_code == 200
    # one confirmation four days ago, one 30 days ago, one at another cafe
    reds = q(select(Redemption).order_by(Redemption.id))
    now = utcnow()
    upd(update(Redemption).where(Redemption.id == reds[1].id).values(confirmed_at=now - timedelta(days=4)))
    upd(update(Redemption).where(Redemption.id == reds[2].id).values(confirmed_at=now - timedelta(days=30)))
    other = make_user("09120000002")
    give_cups(other, 1)
    make_redemption(other, code="20000001", status="confirmed")
    upd(update(Redemption).where(Redemption.code == "20000001").values(cafe_id=q(select(Cafe.id).where(Cafe.slug == "raj"))[0], confirmed_at=now, settle_toman=1))

    s = client.get("/api/partner/summary", headers=partner[1]).json()
    assert s["cafe"]["slug"] == "noghte"
    assert (s["today_cups"], s["today_settle"]) == (1, 64_080)
    assert (s["week_cups"], s["week_settle"], s["pending_settlement"]) == (2, 128_160, 128_160)
    assert s["unique_customers"] == 2
    assert len(s["chart"]) == 7 and sum(d["cups"] for d in s["chart"]) == 2
    assert s["chart"][-1] == {"day": now.date().isoformat(), "cups": 1}
    assert s["chart"][2] == {"day": (now - timedelta(days=4)).date().isoformat(), "cups": 1}
    assert len(s["recent"]) == 3 and set(s["recent"][0]) == {"code", "drink", "at", "settle"}
    assert noghte  # bound partner only ever sees their own cafe


def test_summary_recent_is_limited_to_twelve(client, partner, make_user, make_redemption, db):
    for i in range(15):
        u = make_user(f"0912000{i:04d}")
        make_redemption(u, code=f"3000{i:04d}", status="confirmed")
    db.exec(update(Redemption).values(cafe_id=partner[0].cafe_id, confirmed_at=utcnow(), settle_toman=1))
    db.commit()
    s = client.get("/api/partner/summary", headers=partner[1]).json()
    assert len(s["recent"]) == 12 and s["week_cups"] == 15


def test_confirm_via_cookie_needs_the_csrf_header(client, customer, partner, make_redemption, plant_code):
    make_redemption(customer[0])
    plant_code(partner[0].phone, "123456")
    client.post("/api/auth/verify-otp", json={"phone": partner[0].phone, "code": "123456"})
    assert client.post(CONFIRM, json={"code": "12345678"}).json() == {"detail": "csrf"}
    assert client.post(CONFIRM, json={"code": "12345678"}, headers={"X-Requested-With": "cups-web"}).status_code == 200
