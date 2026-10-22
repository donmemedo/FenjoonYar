import re
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlmodel import func, select, update

from app.main import app
from app.models import OtpCode, User, utcnow
from app.routers.auth import code_hash
from tests.consts import PHONE, PHONE2

REQ, VER = "/api/auth/request-otp", "/api/auth/verify-otp"


def age_otps(upd, seconds):
    upd(update(OtpCode).values(created_at=utcnow() - timedelta(seconds=seconds)))


def verify(client, code, phone=PHONE, **extra):
    return client.post(VER, json={"phone": phone, "code": code, **extra})


def test_code_is_hidden_unless_demo_and_stored_only_as_hmac(client, q):
    body = client.post(REQ, json={"phone": PHONE}).json()
    assert body == {"sent": True, "ttl_seconds": 180, "resend_after_seconds": 60, "dev_code": None}
    (row,) = q(select(OtpCode))
    assert re.fullmatch(r"[0-9a-f]{64}", row.code) and row.attempts == 0 and not row.used


def test_demo_mode_returns_a_six_digit_code_matching_the_hash(client, demo, q):
    code = client.post(REQ, json={"phone": PHONE}).json()["dev_code"]
    assert re.fullmatch(r"[0-9]{6}", code)
    (row,) = q(select(OtpCode))
    assert row.code == code_hash(PHONE, code) and code not in row.code


def test_code_comes_from_secrets_and_is_zero_padded(client, demo, monkeypatch):
    seen = []
    monkeypatch.setattr("app.routers.auth.secrets.randbelow", lambda n: seen.append(n) or 7)
    assert client.post(REQ, json={"phone": PHONE}).json()["dev_code"] == "000007"
    assert seen == [10**6]


def test_login_with_valid_code_sets_cookie_and_hides_the_jwt(client, demo):
    code = client.post(REQ, json={"phone": PHONE}).json()["dev_code"]
    r = verify(client, code, name="  Sara  ")
    assert r.status_code == 200
    assert set(r.json()) == {"user"} and r.json()["user"]["name"] == "Sara"
    cookie = r.headers["set-cookie"]
    assert "cups_session=" in cookie and "HttpOnly" in cookie and "SameSite=lax" in cookie
    assert "Path=/" in cookie and "Max-Age=86400" in cookie and "Secure" not in cookie
    assert client.get("/api/auth/me").json()["phone"] == PHONE


def test_cookie_is_secure_when_configured(client, demo, monkeypatch):
    monkeypatch.setattr("app.config.settings.cookie_secure", True)
    code = client.post(REQ, json={"phone": PHONE}).json()["dev_code"]
    assert "Secure" in verify(client, code).headers["set-cookie"]


def test_native_client_also_gets_the_token_in_the_body(client, demo):
    code = client.post(REQ, json={"phone": PHONE}).json()["dev_code"]
    r = client.post(VER, json={"phone": PHONE, "code": code}, headers={"X-Client": "native"})
    token = r.json()["token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200


def test_code_dies_after_five_wrong_attempts(client, plant_code, q):
    plant_code(code="123456")
    for _ in range(5):
        r = verify(client, "000000")
        assert (r.status_code, r.json()) == (400, {"detail": "invalid_code"})
    assert verify(client, "123456").json() == {"detail": "invalid_code"}  # locked, even when correct
    assert q(select(OtpCode.attempts)) == [5]
    assert q(select(func.count(User.id))) == [0]


def test_correct_code_on_the_fifth_try_still_works(client, plant_code):
    plant_code(code="123456")
    for _ in range(4):
        assert verify(client, "000000").status_code == 400
    assert verify(client, "123456").status_code == 200


def test_every_failure_looks_the_same(client, plant_code):
    plant_code(PHONE, "123456")                                     # wrong code
    plant_code("09120000001", "123456", age=400, ttl=180)           # expired
    plant_code("09120000002", "123456", used=True)                  # used
    plant_code("09120000003", "123456", attempts=5)                 # locked
    answers = {
        (verify(client, c, p).status_code, str(verify(client, c, p).json()))
        for p, c in [(PHONE, "999999"), ("09120000001", "123456"), ("09120000002", "123456"),
                     ("09120000003", "123456"), ("09120000004", "123456")]  # last one: no code at all
    }
    assert answers == {(400, "{'detail': 'invalid_code'}")}


def test_a_code_cannot_log_in_twice(client, plant_code):
    plant_code(code="123456")
    assert verify(client, "123456").status_code == 200
    assert verify(TestClient(app), "123456").status_code == 400


@pytest.mark.parametrize("round_", [0, 1])
def test_one_code_never_logs_in_twice_under_concurrency(plant_code, q, round_):
    phone = f"0912000100{round_}"
    plant_code(phone, "654321")
    gate = Barrier(8)

    def attempt(_):
        c = TestClient(app)
        gate.wait()
        return c.post(VER, json={"phone": phone, "code": "654321"}).status_code

    with ThreadPoolExecutor(8) as pool:
        codes = sorted(pool.map(attempt, range(8)))
    assert codes == [200] + [400] * 7
    assert q(select(func.count(User.id)).where(User.phone == phone)) == [1]
    assert q(select(OtpCode.used)) == [True]


def test_cooldown_blocks_a_resend_within_60_seconds(client, demo, upd):
    assert client.post(REQ, json={"phone": PHONE}).status_code == 200
    r = client.post(REQ, json={"phone": PHONE})
    assert r.status_code == 429
    body = r.json()
    assert body["detail"] == "otp_cooldown" and 1 <= body["retry_after"] <= 60
    assert r.headers["retry-after"] == str(body["retry_after"])
    age_otps(upd, 61)
    assert client.post(REQ, json={"phone": PHONE}).status_code == 200


def test_a_new_code_kills_the_previous_one(client, demo, upd):
    first = client.post(REQ, json={"phone": PHONE}).json()["dev_code"]
    age_otps(upd, 61)
    second = client.post(REQ, json={"phone": PHONE}).json()["dev_code"]
    if first != second:
        assert verify(client, first).status_code == 400
    assert verify(client, second).status_code == 200


def test_request_otp_limits_per_ip_and_per_phone(client, upd):
    for i in range(10):
        assert client.post(REQ, json={"phone": f"0913000000{i}"}).status_code == 200
    r = client.post(REQ, json={"phone": "09139999999"})
    assert r.status_code == 429 and r.json()["detail"] == "rate_limited" and "retry-after" in r.headers


def test_request_otp_limit_per_phone_is_five_per_hour(client, upd):
    for _ in range(5):
        assert client.post(REQ, json={"phone": PHONE}).status_code == 200
        age_otps(upd, 61)
    r = client.post(REQ, json={"phone": PHONE})
    assert (r.status_code, r.json()["detail"]) == (429, "rate_limited")


def test_verify_otp_limits_per_phone(client):
    for _ in range(10):
        assert verify(client, "111111").status_code == 400
    r = verify(client, "111111")
    assert (r.status_code, r.json()["detail"]) == (429, "rate_limited")
    assert verify(client, "111111", phone=PHONE2).status_code == 400  # another phone is unaffected


def test_verify_otp_limits_per_ip(client):
    for i in range(30):
        assert verify(client, "111111", phone=f"091400{i:05d}").status_code == 400
    r = verify(client, "111111", phone="09149999999")
    assert (r.status_code, r.json()["detail"]) == (429, "rate_limited")


@pytest.mark.parametrize("phone", ["0912123456", "091212345678", "0812123456 7", "0912۱۲۳۴۵۶۷"])
def test_phone_must_be_ascii_digits(client, phone):
    assert client.post(REQ, json={"phone": phone}).status_code == 422


@pytest.mark.parametrize("code", ["12345", "1234567", "12345a", "۱۲۳۴۵۶", ""])
def test_code_must_be_six_ascii_digits(client, code):
    assert verify(client, code).status_code == 422
