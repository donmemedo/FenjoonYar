import json
import logging

import pytest

from app.observability import JsonFormatter, hash_phone
from tests.consts import PHONE, PHONE2

CONFIRM = "/api/partner/redemptions/confirm"


@pytest.fixture
def trail():
    """Every audit and app log line, as the JSON the handler would print (captured at emission time)."""
    seen: list[dict] = []

    class Sink(logging.Handler):
        def emit(self, record):
            seen.append(json.loads(JsonFormatter().format(record)))

    sink = Sink()
    logger = logging.getLogger("cups")
    logger.addHandler(sink)
    yield seen
    logger.removeHandler(sink)


def events(trail, name):
    return [e for e in trail if e.get("event") == name]


def test_login_is_audited_without_phone_code_or_token(client, demo, trail):
    code = client.post("/api/auth/request-otp", json={"phone": PHONE}).json()["dev_code"]
    client.post("/api/auth/verify-otp", json={"phone": PHONE, "code": "000000"})
    r = client.post("/api/auth/verify-otp", json={"phone": PHONE, "code": code}, headers={"X-Client": "native"})
    token = r.json()["token"]
    blob = json.dumps(trail, ensure_ascii=False)
    assert PHONE not in blob and code not in blob and token not in blob and PHONE[-7:] not in blob
    assert hash_phone(PHONE) in blob
    assert events(trail, "otp_requested") and events(trail, "login_ok")
    (failed,) = events(trail, "login_failed")
    assert failed["reason"] == "bad_code" and failed["phone"] == hash_phone(PHONE)


def test_phone_hash_is_keyed_and_stable():
    assert hash_phone(PHONE) == hash_phone(PHONE) != hash_phone(PHONE2)
    assert len(hash_phone(PHONE)) == 12 and PHONE not in hash_phone(PHONE)


def test_orders_and_redemptions_are_audited(client, customer, trail):
    client.post("/api/orders", json={"plan_slug": "taste-5"}, headers=customer[1])
    client.post("/api/redemptions", json={"drink": "latte"}, headers=customer[1])
    (order,) = events(trail, "order_created")
    assert order["plan"] == "taste-5" and order["status"] == "pending" and order["user_id"] == customer[0].id
    assert events(trail, "redemption_created")
    assert "Bearer" not in json.dumps(trail)


def test_every_partner_confirm_attempt_is_audited(client, customer, partner, make_redemption, make_user, give_cups, trail):
    make_redemption(customer[0], code="11111111")
    client.post(CONFIRM, json={"code": "11111111"}, headers=partner[1])
    client.post(CONFIRM, json={"code": "22222222"}, headers=partner[1])
    empty = make_user("09120000009")
    give_cups(empty, 1, used=1)
    make_redemption(empty, code="33333333")
    client.post(CONFIRM, json={"code": "33333333"}, headers=partner[1])
    results = [e["result"] for e in events(trail, "partner_confirm")]
    assert results == ["ok", "code_invalid", "no_cups_left"]
    for e in events(trail, "partner_confirm"):
        assert e["partner_id"] == partner[0].id and e["cafe_id"] == partner[0].cafe_id
    assert "11111111" not in json.dumps(trail) and "22222222" not in json.dumps(trail)  # codes are never logged


def test_rate_limit_hits_are_audited(client, partner, trail):
    for i in range(11):
        client.post(CONFIRM, json={"code": f"0000000{i % 10}"}, headers=partner[1])
    hits = events(trail, "rate_limited")
    assert hits and hits[0]["limiter"] == "confirm_failures" and hits[0]["retry_after"] >= 1
    assert events(trail, "partner_confirm")[-1]["result"] == "rate_limited"


def test_logout_is_audited(client, customer, trail):
    client.post("/api/auth/logout", headers=customer[1])
    assert events(trail, "logout")[0]["user_id"] == customer[0].id


def test_access_log_uses_the_route_template_not_the_redemption_code(client, customer, trail):
    code = client.post("/api/redemptions", json={"drink": "latte"}, headers=customer[1]).json()["code"]
    assert client.get(f"/api/redemptions/{code}", headers=customer[1]).status_code == 200
    paths = [e["path"] for e in trail if e.get("msg") == "request"]
    assert "/api/redemptions/{code}" in paths
    assert code not in json.dumps(trail)


def test_otp_cooldown_hits_are_audited(client, trail):
    client.post("/api/auth/request-otp", json={"phone": PHONE})
    assert client.post("/api/auth/request-otp", json={"phone": PHONE}).status_code == 429
    (hit,) = events(trail, "rate_limited")
    assert hit["limiter"] == "otp_cooldown" and hit["phone"] == hash_phone(PHONE) and hit["retry_after"] >= 1
    assert PHONE not in json.dumps(trail)


def test_database_errors_never_carry_bound_values():
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError

    from app.db import engine

    with pytest.raises(OperationalError) as err, engine.connect() as c:
        c.execute(text("SELECT * FROM no_such_table WHERE phone = :p"), {"p": PHONE})
    assert PHONE not in str(err.value)
