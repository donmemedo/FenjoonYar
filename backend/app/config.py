"""Runtime configuration. Plain class that reads the environment once, at construction.

Handlers read ``settings`` attributes at request time (never cached at import), so tests can
flip ``demo_mode`` and friends with monkeypatch.
"""
import os
import secrets

ENVS = ("development", "test", "production")
KNOWN_BAD_SECRETS = {"", "dev-secret-change-me", "change-me-in-production"}
MIN_SECRET_LEN = 32


class ConfigError(RuntimeError):
    """Raised at startup when the environment is unsafe or malformed."""


def _int(name: str, default: int, minimum: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise ConfigError(f"{name} must be an integer, got {raw!r}") from None
    if value < minimum:
        raise ConfigError(f"{name} must be >= {minimum}, got {value}")
    return value


def _flag(name: str) -> bool:
    return os.getenv(name, "0").strip() == "1"


class Settings:
    app_name = "CUPS Iran API"
    jwt_algorithm = "HS256"
    # Settlement paid back to a cafe per confirmed cup (toman).
    avg_cup_price_toman = 89_000
    settlement_rate = 0.72
    max_body_bytes = 16 * 1024

    def __init__(self) -> None:
        self.startup_warnings: list[str] = []

        self.env = os.getenv("ENV", "production").strip().lower()
        if self.env not in ENVS:
            raise ConfigError(f"ENV must be one of {', '.join(ENVS)}, got {self.env!r}")
        self.is_prod = self.env == "production"
        self.is_dev = self.env == "development"

        secret = os.getenv("JWT_SECRET", "").strip()
        if secret in KNOWN_BAD_SECRETS or len(secret) < MIN_SECRET_LEN:
            if not self.is_dev:
                raise ConfigError(
                    f"JWT_SECRET is required (>= {MIN_SECRET_LEN} chars, not a known default) "
                    "when ENV is production or test. Generate one with: "
                    'python -c "import secrets;print(secrets.token_urlsafe(48))"'
                )
            secret = secrets.token_urlsafe(48)
            self.startup_warnings.append(
                "JWT_SECRET unset or weak: using a random per-process secret (development only). "
                "Sessions will not survive a restart."
            )
        self.jwt_secret = secret

        self.jwt_ttl_hours = _int("JWT_TTL_HOURS", 24, 1)
        self.demo_mode = _flag("DEMO_MODE")
        self.cookie_secure = _flag("COOKIE_SECURE")
        self.trusted_proxies = _int("TRUSTED_PROXIES", 0, 0)
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./data/cups.db")

        origins = os.getenv("CORS_ORIGINS", "http://localhost:3044,http://127.0.0.1:3044")
        self.cors_origins = [o.strip().rstrip("/") for o in origins.split(",") if o.strip()]
        if "*" in self.cors_origins:
            raise ConfigError("CORS_ORIGINS must list explicit origins: '*' is not allowed with cookies")

        if self.demo_mode:
            self.startup_warnings.append(
                "DEMO_MODE=1: OTP codes are returned in API responses, the demo partner "
                "09120000000 is seeded and orders are paid instantly. NEVER run this in production."
            )

    @property
    def settle_toman(self) -> int:
        return int(self.avg_cup_price_toman * self.settlement_rate)


settings = Settings()
