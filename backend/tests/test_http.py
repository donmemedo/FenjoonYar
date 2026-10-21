import io
import json
import logging

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.config import Settings
from app.main import create_app
from app.observability import JsonFormatter
from tests.consts import PHONE

PUBLIC = "public, max-age=60, stale-while-revalidate=300"
PUBLIC_PATHS = ("/api/plans", "/api/cafes", "/api/cafes/noghte", "/api/stats")


def settings_for(monkeypatch, **env):
    for name in ("ENV", "JWT_SECRET", "DEMO_MODE", "COOKIE_SECURE", "TRUSTED_PROXIES", "CORS_ORIGINS"):
        monkeypatch.delenv(name, raising=False)
    env.setdefault("JWT_SECRET", "k" * 40)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    return Settings()


def test_security_headers_on_every_kind_of_response(client, customer):
    responses = [
        client.get("/api/health"), client.get("/api/plans"), client.get("/api/nope"),
        client.get("/api/wallet"), client.post("/api/auth/request-otp", json={"phone": "bad"}),
        client.get("/api/wallet", headers=customer[1]), client.get("/api/cafes/missing"),
    ]
    assert {r.status_code for r in responses} >= {200, 401, 404, 422}
    for r in responses:
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["referrer-policy"] == "no-referrer"
        assert r.headers["x-frame-options"] == "DENY"
        csp = r.headers["content-security-policy"]
        assert "default-src 'none'" in csp and "frame-ancestors 'none'" in csp
        assert "strict-transport-security" not in r.headers  # ENV=test, COOKIE_SECURE=0


def test_hsts_only_in_production_with_secure_cookies(monkeypatch):
    def hsts(**env):
        app = create_app(settings_for(monkeypatch, **env))
        return TestClient(app).get("/api/health").headers.get("strict-transport-security")

    assert "max-age=" in hsts(ENV="production", COOKIE_SECURE="1")
    assert hsts(ENV="production", COOKIE_SECURE="0") is None
    assert hsts(ENV="test", COOKIE_SECURE="1") is None


def test_csp_is_skipped_on_docs_in_development_only(monkeypatch):
    dev = TestClient(create_app(settings_for(monkeypatch, ENV="development", JWT_SECRET="")))
    assert "content-security-policy" not in dev.get("/docs").headers
    assert "content-security-policy" in dev.get("/api/health").headers
    assert dev.get("/docs").headers["x-content-type-options"] == "nosniff"


def test_public_catalog_endpoints_are_cacheable(client):
    for path in PUBLIC_PATHS:
        r = client.get(path)
        assert r.status_code == 200 and r.headers["cache-control"] == PUBLIC, path


def test_everything_else_is_no_store(client, customer):
    for path, h in (("/api/health", {}), ("/api/ready", {}), ("/api/wallet", customer[1]), ("/api/auth/me", customer[1]),
                    ("/api/cafes/missing", {}), ("/api/plans?kind=bogus", {}), ("/api/wallet", {})):
        assert client.get(path, headers=h).headers["cache-control"] == "no-store", path
    assert client.post("/api/auth/request-otp", json={"phone": PHONE}).headers["cache-control"] == "no-store"


def test_request_id_is_generated_or_honoured_when_sane(client):
    generated = client.get("/api/health").headers["x-request-id"]
    assert len(generated) == 32 and generated != client.get("/api/health").headers["x-request-id"]
    assert client.get("/api/health", headers={"X-Request-ID": "abc-123_DEF.456"}).headers["x-request-id"] == "abc-123_DEF.456"
    for bad in ("short", "x" * 65, "has space in it", "bad;chars!!", "inject\tx"):
        got = client.get("/api/health", headers={"X-Request-ID": bad}).headers["x-request-id"]
        assert got != bad and len(got) == 32


def test_request_id_is_on_every_log_line(client, customer):
    sink = io.StringIO()
    handler = logging.StreamHandler(sink)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("cups")
    logger.addHandler(handler)
    try:
        client.get("/api/wallet", headers={**customer[1], "X-Request-ID": "trace-0000001"})
    finally:
        logger.removeHandler(handler)
    lines = [json.loads(line) for line in sink.getvalue().splitlines()]
    assert lines and all(line["request_id"] == "trace-0000001" for line in lines)
    assert {line["logger"] for line in lines} == {"cups.http"}


def test_unhandled_error_is_a_clean_500_with_a_logged_traceback(caplog, monkeypatch):
    app = create_app(settings_for(monkeypatch, ENV="test"))

    @app.get("/api/boom")
    def boom():
        raise RuntimeError("secret internal detail")

    caplog.set_level(logging.ERROR)
    r = TestClient(app).get("/api/boom", headers={"X-Request-ID": "trace-0000002"})
    assert r.status_code == 500
    assert r.json() == {"detail": "internal_error", "request_id": "trace-0000002"}
    assert "secret" not in r.text and "Traceback" not in r.text
    assert r.headers["x-request-id"] == "trace-0000002" and r.headers["x-content-type-options"] == "nosniff"
    assert any(rec.exc_info and "secret internal detail" in str(rec.exc_info[1]) for rec in caplog.records)


def test_health_is_liveness_and_reports_demo(client, demo):
    r = client.get("/api/health")
    assert (r.status_code, r.json()) == (200, {"status": "ok", "demo": True})


def test_health_demo_is_false_by_default(client):
    assert client.get("/api/health").json() == {"status": "ok", "demo": False}


def test_ready_checks_the_database(client, monkeypatch):
    assert client.get("/api/ready").json() == {"status": "ok"}

    def broken(_engine):
        raise OperationalError("SELECT 1", {}, Exception("db is down"))

    monkeypatch.setattr("app.main.Session", broken)
    r = client.get("/api/ready")
    assert (r.status_code, r.json()["detail"]) == (503, "not_ready")
    assert "db is down" not in r.text


def test_large_responses_are_gzipped_small_ones_are_not(client):
    big = client.get("/api/cafes", headers={"Accept-Encoding": "gzip"})
    assert big.headers["content-encoding"] == "gzip" and big.json()
    assert "content-encoding" not in client.get("/api/health", headers={"Accept-Encoding": "gzip"}).headers


def test_docs_and_schema_are_hidden_in_production(monkeypatch):
    prod = TestClient(create_app(settings_for(monkeypatch, ENV="production")))
    assert [prod.get(p).status_code for p in ("/docs", "/redoc", "/openapi.json")] == [404, 404, 404]
    assert prod.get("/api/health").status_code == 200


@pytest.mark.parametrize("path", ["/api/plans", "/api/cafes", "/api/stats", "/api/health", "/api/ready"])
def test_public_endpoints_need_no_credentials(client, path):
    assert client.get(path).status_code == 200
