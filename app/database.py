from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./siem.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
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
