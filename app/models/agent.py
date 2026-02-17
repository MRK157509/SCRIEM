# app/models/agent.py

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, UniqueConstraint

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)

    # human-friendly unique name: "lab-win10-01", "server-prod-01", etc.
    name = Column(String, nullable=False, index=True, unique=True)

    # optional metadata (nice for SOC/UI)
    description = Column(String, default="")
    host = Column(String, default="")
    ip = Column(String, default="")
    version = Column(String, default="")
    environment = Column(String, default="")  # dev | lab | prod

    # auth
    token_hash = Column(String, nullable=False, index=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=_utcnow)
    last_seen = Column(DateTime, nullable=True)
    token_last_rotated = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("name", name="uq_agents_name"),
    )
