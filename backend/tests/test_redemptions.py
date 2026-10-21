import re

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import func, select

from app.models import Redemption
from tests.consts import writes

RED = "/api/redemptions"


def create(client, h, **body):
    return client.post(RED, json=body, headers=h)


def test_code_is_eight_digits_and_response_shape(client, customer):
    _, h = customer
    r = create(client, h, drink="latte", cafe_slug="noghte")
    assert r.status_code == 200
    body = r.json()
    assert re.fullmatch(r"[0-9]{8}", body["code"])
    assert body["qr_payload"] == f"cups://redeem/{body['code']}"
    assert (body["status"], body["drink"], body["cafe"]["slug"], body["confirmed_at"]) == ("pending", "latte", "noghte", None)
    assert set(body) == {"id", "code", "drink", "status", "created_at", "expires_at", "confirmed_at", "cafe", "qr_payload"}
    assert create(client, h).json()["drink"] == "espresso"  # default


def test_code_comes_from_secrets_and_is_zero_padded(client, customer, monkeypatch):
    _, h = customer
    seen = []
    monkeypatch.setattr("app.routers.wallet.secrets.randbelow", lambda n: seen.append(n) or 42)
    assert create(client, h).json()["code"] == "00000042"
    assert seen == [10**8]


def test_collision_is_retried_and_exhaustion_is_a_clean_500(client, customer, make_user, make_redemption, monkeypatch):
    _, h = customer
    make_redemption(make_user("09120000009"), code="00000042")
    picks = iter([42, 42, 43])
    monkeypatch.setattr("app.routers.wallet.secrets.randbelow", lambda n: next(picks))
    assert create(client, h).json()["code"] == "00000043"
    monkeypatch.setattr("app.routers.wallet.secrets.randbelow", lambda n: 42)
    r = create(client, h)
    assert (r.status_code, r.json()["detail"]) == (500, "internal_error")


def test_database_enforces_unique_codes_and_one_pending_per_user(make_user, make_redemption, db):
    a, b = make_user(), make_user("09120000009")
    make_redemption(a, code="11111111")
    with pytest.raises(IntegrityError):
        make_redemption(b, code="11111111")  # same code
    db.rollback()
    with pytest.raises(IntegrityError):
        make_redemption(a, code="22222222")  # second pending for the same user
    db.rollback()
    make_redemption(a, code="33333333", status="confirmed")  # history is unrestricted


def test_creating_a_code_cancels_the_users_other_pending_codes(client, customer, q):
    _, h = customer
    first = create(client, h).json()
    second = create(client, h, drink="cold").json()
    rows = {r.code: r.status for r in q(select(Redemption))}
    assert rows == {first["code"]: "cancelled", second["code"]: "pending"}
    assert client.get(f"{RED}/{first['code']}", headers=h).json()["status"] == "cancelled"


def test_other_users_codes_are_untouched(client, customer, make_user, give_cups, bearer, q):
    other = make_user("09120000009")
    give_cups(other, 3)
    theirs = create(client, bearer(other)).json()
    create(client, customer[1])
    assert {r.code: r.status for r in q(select(Redemption))}[theirs["code"]] == "pending"


@pytest.mark.parametrize("body", [
    {"drink": "mocha"}, {"drink": "x" * 200}, {"drink": ""}, {"drink": 3},
    {"cafe_slug": "Raj"}, {"cafe_slug": "a b"}, {"cafe_slug": "a" * 41}, {"cafe_slug": "../x"}, {"cafe_slug": "رج"},
])
def test_drink_and_cafe_slug_are_validated(client, customer, body):
    assert create(client, customer[1], **body).status_code == 422


@pytest.mark.parametrize("drink", ["espresso", "latte", "cappuccino", "filter", "cold"])
def test_every_listed_drink_is_accepted(client, customer, drink):
    assert create(client, customer[1], drink=drink).json()["drink"] == drink


def test_unknown_cafe_slug_is_404(client, customer, q):
    r = create(client, customer[1], cafe_slug="does-not-exist")
    assert (r.status_code, r.json()) == (404, {"detail": "not_found"})
    assert q(select(func.count(Redemption.id))) == [0]


def test_no_cups_left_is_400(client, make_user, give_cups, bearer):
    user = make_user()
    h = bearer(user)
    assert create(client, h).json() == {"detail": "no_cups_left"}
    give_cups(user, 2, days=-1)  # only an expired batch
    assert create(client, h).json() == {"detail": "no_cups_left"}
    give_cups(user, 2, used=2)  # only an exhausted batch
    assert create(client, h).status_code == 400
    give_cups(user, 2)
    assert create(client, h).status_code == 200


def test_redemptions_are_limited_to_ten_per_minute(client, customer):
    _, h = customer
    for _ in range(10):
        assert create(client, h).status_code == 200
    r = create(client, h)
    assert (r.status_code, r.json()["detail"]) == (429, "rate_limited") and "retry-after" in r.headers


def test_detail_is_owner_only_and_needs_eight_ascii_digits(client, customer, make_user, give_cups, bearer):
    mine = create(client, customer[1]).json()["code"]
    assert client.get(f"{RED}/{mine}", headers=customer[1]).json()["code"] == mine
    stranger = make_user("09120000009")
    assert client.get(f"{RED}/{mine}", headers=bearer(stranger)).json() == {"detail": "not_found"}
    for bad in ("123456", "1234567a", "123456789", "۱۲۳۴۵۶۷۸", "99999999"):
        r = client.get(f"{RED}/{bad}", headers=customer[1])
        assert (r.status_code, r.json()) == (404, {"detail": "not_found"})


def test_list_is_newest_first_and_per_user(client, customer, make_user, bearer, give_cups):
    _, h = customer
    a = create(client, h).json()["id"]
    b = create(client, h, drink="cold").json()["id"]
    other = make_user("09120000009")
    give_cups(other, 1)
    create(client, bearer(other))
    assert [r["id"] for r in client.get(RED, headers=h).json()] == [b, a]


def test_overdue_pending_is_reported_expired_without_a_write(client, customer, make_redemption, q, sql_log):
    user, h = customer
    make_redemption(user, code="12345678", expires_in=-5)
    sql_log.clear()
    body = client.get(f"{RED}/12345678", headers=h).json()
    assert body["status"] == "expired"
    assert client.get(RED, headers=h).json()[0]["status"] == "expired"
    assert [r.status for r in q(select(Redemption))] == ["pending"]  # database untouched
    assert writes(sql_log) == []


def test_confirmed_at_and_expiry_are_utc_iso(client, customer):
    body = create(client, customer[1]).json()
    assert body["created_at"].endswith("Z") and body["expires_at"].endswith("Z")
    assert body["expires_at"] > body["created_at"]
