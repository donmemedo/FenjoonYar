import pytest
from sqlmodel import func, select

from app.models import User
from tests.consts import PHONE

REQ, VER = "/api/auth/request-otp", "/api/auth/verify-otp"


def patch(client, h, **body):
    return client.patch("/api/auth/me", json=body, headers=h)


def test_name_is_stripped_and_capped_at_80(client, customer):
    _, h = customer
    assert patch(client, h, name="  Sara  ").json()["name"] == "Sara"
    assert patch(client, h, name="س" * 80).status_code == 200
    assert patch(client, h, name="x" * 81).status_code == 422
    assert patch(client, h, name="   ").json()["name"] is None  # blank clears it


def test_name_on_login_is_capped_too(client, plant_code):
    plant_code(PHONE, "123456")
    assert client.post(VER, json={"phone": PHONE, "code": "123456", "name": "x" * 81}).status_code == 422


@pytest.mark.parametrize("email,ok", [
    ("a@b.co", True), ("  sara@example.com  ", True), ("", True),
    ("plain", False), ("a@b", False), ("a @b.co", False), ("@b.co", False), ("a@@b.co", False),
    ("a" * 250 + "@b.co", False),
])
def test_email_is_checked_and_capped_at_254(client, customer, email, ok):
    r = patch(client, customer[1], email=email)
    assert (r.status_code == 200) is ok, r.text


def test_email_length_boundary(client, customer):
    local = "a" * (254 - len("@b.co"))
    assert patch(client, customer[1], email=f"{local}@b.co").status_code == 200
    assert patch(client, customer[1], email=f"{local}a@b.co").status_code == 422


@pytest.mark.parametrize("query", [
    "q=" + "x" * 65, "city=" + "x" * 41, "tag=" + "x" * 41,
])
def test_catalog_query_params_are_capped(client, query):
    assert client.get(f"/api/cafes?{query}").status_code == 422


def test_catalog_boundaries_are_accepted(client):
    assert client.get("/api/cafes?q=" + "x" * 64).status_code == 200


def test_plan_kind_is_a_literal(client):
    assert client.get("/api/plans?kind=bogus").status_code == 422
    for kind in ("package", "subscription", "corporate"):
        assert {p["kind"] for p in client.get(f"/api/plans?kind={kind}").json()} == {kind}


def test_cafe_slug_path_is_capped(client):
    assert client.get("/api/cafes/" + "x" * 41).status_code == 422


def test_body_over_16kb_is_413_by_content_length(client, customer):
    big = {"name": "x" * 20_000}
    r = client.patch("/api/auth/me", json=big, headers=customer[1])
    assert (r.status_code, r.json()) == (413, {"detail": "payload_too_large"})
    assert client.post(REQ, json={"phone": PHONE, "pad": "x" * 17_000}).status_code == 413


def test_body_at_the_limit_is_still_parsed(client):
    body = b'{"phone":"%s","pad":"%s"}' % (PHONE.encode(), b"x" * (16 * 1024 - 40))
    assert len(body) <= 16 * 1024
    r = client.post(REQ, content=body, headers={"Content-Type": "application/json"})
    assert r.status_code == 200


def test_streamed_body_without_content_length_is_413(client):
    def chunks():
        for _ in range(40):
            yield b"x" * 1024  # 40 KB, chunked: there is no Content-Length to check up front

    r = client.post(REQ, content=chunks(), headers={"Content-Type": "application/json"})
    assert (r.status_code, r.json()) == (413, {"detail": "payload_too_large"})


def test_lying_content_length_cannot_smuggle_a_big_body(client):
    def chunks():
        for _ in range(40):
            yield b"x" * 1024

    r = client.post(REQ, content=chunks(), headers={"Content-Type": "application/json", "Content-Length": "10"})
    assert r.status_code in (400, 413)  # never a parsed 200


def test_bad_content_length_is_refused(client):
    r = client.post(REQ, content=b"{}", headers={"Content-Length": "abc", "Content-Type": "application/json"})
    assert r.status_code in (400, 413)


def test_oversize_requests_create_nothing(client, q):
    client.post(VER, json={"phone": PHONE, "code": "123456", "name": "x" * 20_000})
    assert q(select(func.count(User.id))) == [0]
