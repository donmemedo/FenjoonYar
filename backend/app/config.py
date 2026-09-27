import os


class Settings:
    app_name: str = "CUPS Iran API"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/cups.db")
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_ttl_hours: int = 24 * 14
    cors_origins: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    # In dev the OTP is returned by the API instead of being sent by SMS.
    expose_otp: bool = os.getenv("EXPOSE_OTP", "1") == "1"


settings = Settings()
