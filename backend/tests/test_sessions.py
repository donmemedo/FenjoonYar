import time

import jwt
import pytest
from sqlmodel import select, update

from app.auth import create_token
from app.config import settings
from app.models import Cafe, User
from tests.consts import CSRF, PHONE


def forge(**claims):
    now = int(time.time())
    payload = {"sub": "1", "tv": 0, "iat": now, "exp": now + 600, **claims}
    payload = {k: v for k, v in payload.items() if v is not None}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def login_native(client, plant_code):
    plant_code(PHONE, "123456")
    r = client.post("/api/auth/verify-otp", json={"phone": PHONE, "code": "123456"}, headers={"X-Client": "native"})
    assert r.status_code == 200
    return r.json()["token"]


def test_token_claims(make_user):
    claims = jwt.decode(create_token(make_user()), settings.jwt_secret, algorithms=["HS256"])
    assert set(claims) == {"sub", "tv", "iat", "exp"}
    assert isinstance(claims["sub"], str) and claims["tv"] == 0
    assert claims["exp"] - claims["iat"] == settings.jwt_ttl_hours * 3600


@pytest.mark.parametrize("token", [
    "not-a-jwt",
    "a.b.c",
    pytest.param(lambda: forge(sub="abc"), id="non-integer-sub"),
    pytest.param(lambda: forge(sub="1.5"), id="float-sub"),
    pytest.param(lambda: forge(sub="-1"), id="negative-sub"),
    pytest.param(lambda: forge(sub="۱"), id="persian-digit-sub"),
    pytest.param(lambda: forge(sub=1), id="int-sub"),
    pytest.param(lambda: forge(sub=None), id="missing-sub"),
    pytest.param(lambda: forge(tv=None), id="missing-tv"),
    pytest.param(lambda: forge(tv="0"), id="string-tv"),
    pytest.param(lambda: forge(tv=True), id="bool-tv"),
    pytest.param(lambda: forge(iat=None), id="missing-iat"),
    pytest.param(lambda: forge(exp=None), id="missing-exp"),
    pytest.param(lambda: forge(exp=int(time.time()) - 5), id="expired"),
    pytest.param(lambda: jwt.encode({"sub": "1", "tv": 0, "iat": 1, "exp": 4_000_000_000}, "x" * 40, algorithm="HS256"),
                 id="wrong-secret"),
    pytest.param(lambda: jwt.encode({"sub": "1", "tv": 0, "iat": 1, "exp": 4_000_000_000}, None, algorithm="none"),
                 id="alg-none"),
])
def test_malformed_tokens_are_401_never_500(client, make_user, token):
    make_user()
    value = token() if callable(token) else token
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {value}"})
    assert r.status_code == 401, r.text
    assert r.json()["detail"] in ("invalid_token", "user_not_found")
    client.cookies.set("cups_session", value)
    assert client.get("/api/auth/me").status_code == 401


def test_missing_credentials_and_unknown_user(client):
    r = client.get("/api/auth/me")
    assert (r.status_code, r.json()) == (401, {"detail": "not_authenticated"})
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {forge(sub='999')}"}).json() == {
        "detail": "user_not_found"
    }


def test_token_version_mismatch_is_rejected(client, make_user, upd):
    user = make_user()
    h = {"Authorization": f"Bearer {create_token(user)}"}
    assert client.get("/api/auth/me", headers=h).status_code == 200
    upd(update(User).where(User.id == user.id).values(token_version=3))
    assert client.get("/api/auth/me", headers=h).json() == {"detail": "invalid_token"}


def test_logout_kills_every_old_token(client, plant_code):
    token = login_native(client, plant_code)  # also sets the cookie on this client
    bearer = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me").status_code == 200
    r = client.post("/api/auth/logout", headers=CSRF)
    assert r.status_code == 204 and r.content == b""
    assert "cups_session=" in r.headers["set-cookie"] and "Max-Age=0" in r.headers["set-cookie"]
    assert client.get("/api/auth/me", headers=bearer).status_code == 401  # old token is dead
    assert client.get("/api/auth/me").status_code == 401  # cookie was cleared


def test_logout_needs_csrf_header_with_cookie_but_not_with_bearer(client, plant_code):
    token = login_native(client, plant_code)
    assert client.post("/api/auth/logout").json() == {"detail": "csrf"}
    fresh = type(client)(client.app)
    assert fresh.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"}).status_code == 204


def test_cookie_auth_rules_for_unsafe_methods(client, plant_code):
    login_native(client, plant_code)
    assert client.get("/api/auth/me").status_code == 200  # safe method: no header needed
    r = client.patch("/api/auth/me", json={"name": "Ali"})
    assert (r.status_code, r.json()) == (403, {"detail": "csrf"})
    assert client.patch("/api/auth/me", json={"name": "Ali"}, headers={"X-Requested-With": "other"}).status_code == 403
    r = client.patch("/api/auth/me", json={"name": "Ali"}, headers=CSRF)
    assert r.status_code == 200 and r.json()["name"] == "Ali"
    assert client.post("/api/orders", json={"plan_slug": "taste-5"}).status_code == 403


def test_bearer_requests_need_no_csrf_header(client, customer):
    _, headers = customer
    assert client.patch("/api/auth/me", json={"name": "Ali"}, headers=headers).status_code == 200


def test_bad_origin_is_refused_on_unsafe_methods(client, customer):
    _, headers = customer
    evil = {"Origin": "https://evil.example"}
    for path, body in (("/api/auth/request-otp", {"phone": PHONE}), ("/api/orders", {"plan_slug": "taste-5"})):
        r = client.post(path, json=body, headers={**headers, **evil})
        assert (r.status_code, r.json()) == (403, {"detail": "bad_origin"})
    assert client.post("/api/auth/request-otp", json={"phone": PHONE}, headers={"Origin": "null"}).status_code == 403
    # not allowed outside development, even for localhost
    assert client.post("/api/auth/request-otp", json={"phone": PHONE}, headers={"Origin": "http://localhost:9"}).status_code == 403
    ok = client.post("/api/auth/request-otp", json={"phone": PHONE}, headers={"Origin": "http://localhost:3044"})
    assert ok.status_code == 200
    assert client.post("/api/auth/request-otp", json={"phone": "09130000000"}).status_code == 200  # no Origin
    assert client.get("/api/plans", headers=evil).status_code == 200  # safe method


def test_cors_allows_only_listed_origins_and_methods(client):
    pre = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-requested-with,x-client"}
    ok = client.options("/api/orders", headers={"Origin": "http://localhost:3044", **pre})
    assert ok.headers["access-control-allow-origin"] == "http://localhost:3044"
    assert ok.headers["access-control-allow-credentials"] == "true"
    assert "DELETE" not in ok.headers["access-control-allow-methods"] and "PATCH" in ok.headers["access-control-allow-methods"]
    bad = client.options("/api/orders", headers={"Origin": "https://evil.example", **pre})
    assert "access-control-allow-origin" not in bad.headers
    assert "access-control-allow-origin" not in client.options(
        "/api/orders", headers={"Origin": "http://localhost:5173", **pre}
    ).headers


def test_role_and_cafe_binding_are_reread_from_the_database(client, partner, upd):
    user, headers = partner
    assert client.get("/api/partner/summary", headers=headers).json()["cafe"]["slug"] == "noghte"
    raj = select(Cafe.id).where(Cafe.slug == "raj").scalar_subquery()
    upd(update(User).where(User.id == user.id).values(cafe_id=raj))
    assert client.get("/api/partner/summary", headers=headers).json()["cafe"]["slug"] == "raj"
    upd(update(User).where(User.id == user.id).values(role="customer"))
    r = client.get("/api/partner/summary", headers=headers)
    assert (r.status_code, r.json()) == (403, {"detail": "partner_only"})


def test_customer_cannot_use_partner_endpoints(client, customer):
    _, headers = customer
    assert client.get("/api/partner/summary", headers=headers).status_code == 403
    assert client.post("/api/partner/redemptions/confirm", json={"code": "12345678"}, headers=headers).status_code == 403


def test_protected_routes_need_a_session(client):
    for method, path in (("get", "/api/wallet"), ("get", "/api/orders"), ("get", "/api/redemptions"),
                         ("get", "/api/partner/summary"), ("post", "/api/orders")):
        assert getattr(client, method)(path).status_code == 401
