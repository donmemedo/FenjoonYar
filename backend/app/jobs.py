"""Periodic maintenance, run in a worker thread so the event loop never blocks on SQLite."""
import asyncio
import logging
from datetime import timedelta

from sqlmodel import Session, delete, update

from .db import engine, run
from .models import OtpCode, Redemption, utcnow
from .ratelimit import limiter

log = logging.getLogger("cups.jobs")
INTERVAL_SECONDS = 60
OTP_KEEP = timedelta(hours=1)


def run_maintenance() -> dict:
    now = utcnow()
    with Session(engine) as session:
        expired = run(
            session,
            update(Redemption).where(Redemption.status == "pending", Redemption.expires_at <= now)
            .values(status="expired"),
        ).rowcount
        purged = run(
            session,
            delete(OtpCode).where(
                OtpCode.created_at < now - OTP_KEEP, (OtpCode.used == True) | (OtpCode.expires_at <= now)  # noqa: E712
            ),
        ).rowcount
        session.commit()
    trimmed = limiter.purge()
    return {"redemptions_expired": expired, "otp_purged": purged, "limiter_trimmed": trimmed}


async def maintenance_loop(interval: float = INTERVAL_SECONDS) -> None:
    while True:
        await asyncio.sleep(interval)
        try:
            stats = await asyncio.to_thread(run_maintenance)
            if stats["redemptions_expired"] or stats["otp_purged"]:
                log.info("maintenance", extra={"fields": stats})
        except Exception:  # one bad tick must not kill the loop
            log.exception("maintenance_failed")
