import pytest
from fastapi.testclient import TestClient

from app.config import ConfigError, Settings
from app.main import create_app

STRONG = "k" * 40


def build(monkeypatch, **env):
    for name in ("ENV", "JWT_SECRET", "DEMO_MODE", "COOKIE_SECURE", "TRUSTED_PROXIES", "JWT_TTL_HOURS",
                 "CORS_ORIGINS", "EXPOSE_OTP"):
        monkeypatch.delenv(name, raising=False)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    return Settings()


@pytest.mark.parametrize("env", ["production", "test"])
@pytest.mark.parametrize("secret", ["", "dev-secret-change-me", "change-me-in-production", "short", "x" * 31])
def test_weak_secret_refuses_to_start(monkeypatch, env, secret):
    with pytest.raises(ConfigError, match="JWT_SECRET"):
        build(monkeypatch, ENV=env, JWT_SECRET=secret)


def test_missing_secret_and_default_env_is_production(monkeypatch):
    with pytest.raises(ConfigError, match="JWT_SECRET"):
        build(monkeypatch)  # ENV unset -> production, JWT_SECRET unset -> refuse
    cfg = build(monkeypatch, JWT_SECRET=STRONG)
    assert cfg.env == "production" and cfg.is_prod and not cfg.demo_mode


def test_strong_secret_is_accepted_and_defaults(monkeypatch):
    cfg = build(monkeypatch, ENV="production", JWT_SECRET=STRONG)
    assert cfg.jwt_secret == STRONG
    assert (cfg.jwt_ttl_hours, cfg.cookie_secure, cfg.trusted_proxies) == (24, False, 0)
    assert cfg.startup_warnings == []


def test_development_gets_random_secret_and_a_warning(monkeypatch):
    a = build(monkeypatch, ENV="development")
    b = build(monkeypatch, ENV="development", JWT_SECRET="dev-secret-change-me")
    assert len(a.jwt_secret) >= 32 and a.jwt_secret != b.jwt_secret
    assert any("JWT_SECRET" in w for w in a.startup_warnings)


def test_unknown_env_is_refused(monkeypatch):
    with pytest.raises(ConfigError, match="ENV"):
        build(monkeypatch, ENV="staging", JWT_SECRET=STRONG)


def test_demo_mode_logs_a_loud_warning_and_expose_otp_is_gone(monkeypatch):
    cfg = build(monkeypatch, ENV="test", JWT_SECRET=STRONG, DEMO_MODE="1")
    assert cfg.demo_mode and any("DEMO_MODE=1" in w for w in cfg.startup_warnings)
    legacy = build(monkeypatch, ENV="test", JWT_SECRET=STRONG, EXPOSE_OTP="1")
    assert legacy.demo_mode is False and not hasattr(legacy, "expose_otp")


@pytest.mark.parametrize("name,value", [
    ("TRUSTED_PROXIES", "many"), ("TRUSTED_PROXIES", "-1"), ("JWT_TTL_HOURS", "0"), ("JWT_TTL_HOURS", "abc"),
])
def test_numeric_settings_are_validated(monkeypatch, name, value):
    with pytest.raises(ConfigError, match=name):
        build(monkeypatch, ENV="test", JWT_SECRET=STRONG, **{name: value})


def test_cors_origins_are_explicit(monkeypatch):
    with pytest.raises(ConfigError, match="CORS_ORIGINS"):
        build(monkeypatch, ENV="test", JWT_SECRET=STRONG, CORS_ORIGINS="*")
    cfg = build(monkeypatch, ENV="test", JWT_SECRET=STRONG, CORS_ORIGINS=" https://a.example/ , https://b.example")
    assert cfg.cors_origins == ["https://a.example", "https://b.example"]


def test_docs_are_disabled_in_production_only(monkeypatch):
    prod = TestClient(create_app(build(monkeypatch, ENV="production", JWT_SECRET=STRONG)))
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert prod.get(path).status_code == 404
    dev = TestClient(create_app(build(monkeypatch, ENV="development")))
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert dev.get(path).status_code == 200


def test_settlement_constants_live_in_config(monkeypatch):
    cfg = build(monkeypatch, ENV="test", JWT_SECRET=STRONG)
    assert (cfg.avg_cup_price_toman, cfg.settlement_rate, cfg.settle_toman) == (89_000, 0.72, 64_080)
