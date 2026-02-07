import logging
from fastapi import FastAPI
from sqlalchemy.orm import Session

from app.database import engine
from app.models import Base, User
from app.routers import alerts, timeline, events, auth

from passlib.context import CryptContext

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("scriem")

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create DB tables (dev)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SCRIEM")

# Routers
app.include_router(auth.router)
app.include_router(alerts.router)
app.include_router(timeline.router)
app.include_router(events.router)


def seed_admin():
    # dev-only: create admin if missing
    from app.database import SessionLocal

    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            return
        u = User(
            username="admin",
            password_hash=pwd.hash("admin123"),
            role="ADMIN",
        )
        db.add(u)
        db.commit()
        logger.info("Seeded admin user: admin / admin123")
    finally:
        db.close()


seed_admin()


@app.get("/")
def health():
    return {"status": "SIEM running"}
