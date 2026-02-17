from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

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
