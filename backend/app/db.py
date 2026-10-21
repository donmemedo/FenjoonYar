import logging
import os
from collections.abc import Iterator

from sqlalchemy import event, inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, SQLModel, create_engine

from .config import settings

log = logging.getLogger("cups.db")
IS_SQLITE = settings.database_url.startswith("sqlite")

if IS_SQLITE:
    _db = settings.database_url.removeprefix("sqlite:///")
    if _db and _db != ":memory:" and not _db.startswith("file:"):
        os.makedirs(os.path.dirname(os.path.abspath(_db)), exist_ok=True)

engine = create_engine(
    settings.database_url,
    echo=False,
    hide_parameters=True,  # bound values (phones, codes) never appear in logged DB errors
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
)

SQLITE_PRAGMAS = (
    "PRAGMA journal_mode=WAL",
    "PRAGMA synchronous=NORMAL",
    "PRAGMA busy_timeout=5000",
    "PRAGMA foreign_keys=ON",
    "PRAGMA cache_size=-20000",  # 20 MB page cache per connection
    "PRAGMA temp_store=MEMORY",
)

if IS_SQLITE:

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record) -> None:  # runs on every new connection
        cur = dbapi_conn.cursor()
        for pragma in SQLITE_PRAGMAS:
            cur.execute(pragma)
        cur.close()


# create_all never alters existing tables: add columns introduced after the first release.
NEW_COLUMNS = {
    "user": [("token_version", "INTEGER NOT NULL DEFAULT 0")],
    "otpcode": [
        ("attempts", "INTEGER NOT NULL DEFAULT 0"),
        ("created_at", "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00.000000'"),
    ],
}

# Indexes for the real queries. Names are stable so IF NOT EXISTS makes this idempotent.
INDEXES = (
    "CREATE INDEX IF NOT EXISTS ix_redemption_cafe_status_confirmed ON redemption (cafe_id, status, confirmed_at)",
    "CREATE INDEX IF NOT EXISTS ix_redemption_user_id_id ON redemption (user_id, id)",
    "CREATE INDEX IF NOT EXISTS ix_redemption_status_expires ON redemption (status, expires_at)",
    "CREATE INDEX IF NOT EXISTS ix_creditbatch_user_expires ON creditbatch (user_id, expires_at)",
    'CREATE INDEX IF NOT EXISTS ix_order_user_id_id ON "order" (user_id, id)',
    "CREATE INDEX IF NOT EXISTS ix_otpcode_phone_used_id ON otpcode (phone, used, id)",
)
# Integrity indexes: a failure is tolerated (legacy rows may already violate them) but logged.
UQ_CODE = "CREATE UNIQUE INDEX IF NOT EXISTS uq_redemption_code ON redemption (code)"
# at most one pending redemption per customer
UQ_ONE_PENDING = (
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_redemption_one_pending ON redemption (user_id) WHERE status = 'pending'"
)
# Single-column indexes of the first release, now covered by the composites above.
REDUNDANT_INDEXES = ("ix_otpcode_phone", "ix_redemption_user_id", "ix_creditbatch_user_id", "ix_order_user_id")


def _try(eng, stmt: str) -> bool:
    try:
        with eng.begin() as conn:
            conn.execute(text(stmt))
        return True
    except SQLAlchemyError as exc:
        # ponytail: legacy duplicates block a unique index; fix the rows by hand and restart.
        log.warning("schema: could not run %r (%s)", stmt.split(" ON ")[0], exc.__class__.__name__)
        return False


def ensure_schema(eng=engine) -> None:
    insp = inspect(eng)
    for table, cols in NEW_COLUMNS.items():
        have = {c["name"] for c in insp.get_columns(table)}
        for name, ddl in cols:
            if name not in have:
                with eng.begin() as conn:
                    conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN {name} {ddl}'))
                log.info("schema: added %s.%s", table, name)
    for stmt in INDEXES:
        with eng.begin() as conn:
            conn.execute(text(stmt))
    # the legacy plain code index is only dropped once the unique one exists
    if _try(eng, UQ_CODE):
        _try(eng, "DROP INDEX IF EXISTS ix_redemption_code")
    else:
        _try(eng, "CREATE INDEX IF NOT EXISTS ix_redemption_code ON redemption (code)")
    _try(eng, UQ_ONE_PENDING)
    for name in REDUNDANT_INDEXES:
        _try(eng, f"DROP INDEX IF EXISTS {name}")


def init_db(eng=engine) -> None:
    SQLModel.metadata.create_all(eng)
    ensure_schema(eng)


def run(session: Session, stmt):
    """Run a bulk UPDATE/DELETE without ORM identity-map syncing (cheaper; rowcount stays valid)."""
    return session.exec(stmt, execution_options={"synchronize_session": False})


def get_session() -> Iterator[Session]:
    # expire_on_commit=False: no re-SELECT of every object after each commit
    with Session(engine, expire_on_commit=False) as session:
        yield session
