import logging
from fastapi import FastAPI
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.database import engine, SessionLocal
from app.models import Base, User

from app.routers import alerts, timeline, events, auth

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("scriem")

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SCRIEM")

app.include_router(auth.router)
app.include_router(alerts.router)
app.include_router(timeline.router)
app.include_router(events.router)

def seed_user(db: Session, username: str, password: str, role: str):
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        return
    u = User(username=username, password_hash=pwd.hash(password), role=role)
    db.add(u)
    db.commit()
    logger.info(f"Seeded user: {username} / {password} ({role})")

def seed_defaults():
    db: Session = SessionLocal()
    try:
        seed_user(db, "admin", "admin123", "ADMIN")
        seed_user(db, "analyst", "analyst123", "SOC_ANALYST")
        seed_user(db, "user", "user123", "USER")
    finally:
        db.close()

seed_defaults()

@app.get("/")
def health():
    return {"status": "SIEM running"}
