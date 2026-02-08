from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime, timezone
from .database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="USER")  # USER | SOC_ANALYST | ADMIN
    created_at = Column(DateTime, default=utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_username = Column(String, index=True)
    actor_role = Column(String, index=True)
    action = Column(String, index=True)       # e.g. ALERT_STATUS_UPDATE
    target_type = Column(String, index=True)  # ALERT | EVENT | CASE
    target_id = Column(String, index=True)    # string for flexibility
    details = Column(JSON, default={})
    created_at = Column(DateTime, default=utcnow)

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    host = Column(String, index=True)
    user = Column(String, index=True)
    action = Column(String)
    details = Column(JSON)
    timestamp = Column(DateTime, default=utcnow)

    event_id = Column(Integer, index=True)
    created_at = Column(DateTime, default=utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    severity = Column(String)
    status = Column(String, default="OPEN")
    description = Column(String)

    host = Column(String, index=True)
    event_id = Column(Integer, index=True)

    notes = Column(String, default="")
    rule_name = Column(String)

    created_at = Column(DateTime, default=utcnow)
