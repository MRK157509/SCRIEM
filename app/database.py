from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import DATABASE_URL


def _ensure_sqlite_parent_dir(database_url: str) -> None:
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite":
        return

    db_path = url.database
    if not db_path or db_path == ":memory:":
        return

    path = Path(db_path)
    if not path.is_absolute():
        path = Path.cwd() / path

    path.parent.mkdir(parents=True, exist_ok=True)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

_ensure_sqlite_parent_dir(DATABASE_URL)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

try:
    import app.models_legacy  # noqa: F401
    import app.models.alert_ai_analysis  # noqa: F401
    import app.models.agent  # noqa: F401
except Exception:
    # Avoid hard crash during tooling; runtime will import via main.py anyway.
    pass
