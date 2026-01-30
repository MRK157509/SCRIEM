from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime, timezone
from .database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    host = Column(String)
    user = Column(String)
    action = Column(String)
    details = Column(JSON)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    host = Column(String, index=True)
    event_id = Column(Integer, index=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    severity = Column(String)
    status = Column(String, default="OPEN")
    description = Column(String)

    # 🔥 THESE TWO LINES WERE MISSING
    host = Column(String, index=True)
    event_id = Column(Integer, index=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

