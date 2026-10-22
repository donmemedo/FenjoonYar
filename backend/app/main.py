import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlmodel import Session

from .config import Settings, settings
from .db import engine, init_db
from .errors import ApiError
from .jobs import maintenance_loop
from .middleware import DEV_ORIGIN_RE, GuardMiddleware, HardeningMiddleware
from .observability import setup_logging
from .routers import auth, catalog, partner, wallet
from .seed import seed

setup_logging()
log = logging.getLogger("cups.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    for warning in settings.startup_warnings:
        log.warning(warning)
    log.info("starting", extra={"fields": {"env": settings.env, "demo": settings.demo_mode}})
    init_db()
    with Session(engine) as session:
        seed(session, demo=settings.demo_mode)
    job = asyncio.create_task(maintenance_loop())
    try:
        yield
    finally:
        job.cancel()
        with suppress(asyncio.CancelledError):
            await job


def create_app(cfg: Settings = settings) -> FastAPI:
    docs = None if cfg.is_prod else "/docs"
    app = FastAPI(
        title=cfg.app_name, version="2.0.0", lifespan=lifespan,
        docs_url=docs, redoc_url=None if cfg.is_prod else "/redoc",
        openapi_url=None if cfg.is_prod else "/openapi.json",
    )

    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError):
        return JSONResponse(exc.body(), status_code=exc.status_code, headers=exc.headers)

    # add_middleware: the last one added is the outermost
    app.add_middleware(GuardMiddleware, cfg=cfg)
    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_origin_regex=DEV_ORIGIN_RE.pattern if cfg.is_dev else None,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-Client"],
        max_age=600,
    )
    app.add_middleware(HardeningMiddleware, cfg=cfg)

    for r in (auth.router, catalog.router, wallet.router, partner.router):
        app.include_router(r)

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "demo": settings.demo_mode}

    @app.get("/api/ready")
    def ready():
        try:
            with Session(engine) as session:
                session.exec(text("SELECT 1"))
        except Exception:
            log.exception("not_ready")
            raise HTTPException(503, "not_ready") from None
        return {"status": "ok"}

    return app


app = create_app()
