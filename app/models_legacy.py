from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    JSON,
    ForeignKey,
    UniqueConstraint,
)
from app.database import Base


from sqlalchemy.orm import relationship  # ADD THIS IMPORT AT TOP IF NOT PRESENT

# ---------------------------
# Core SIEM Models
# ---------------------------

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)

    event_type = Column(String, index=True)
    host = Column(String, index=True)
    user = Column(String, index=True)
    action = Column(String)
    details = Column(JSON)

    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String)
    severity = Column(String)
    status = Column(String, default="OPEN")
    description = Column(String)

    host = Column(String, index=True)
    event_id = Column(Integer, index=True)

    # Detection intelligence
    rule_id = Column(Integer, index=True)          # ✅ Phase 5
    rule_name = Column(String)                     # optional (legacy/compat)

    notes = Column(String, default="")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # -----------------------------
    # 🤖 Phase 6 — AI Analysis Link
    # One alert ↔ one AI analysis record
    # -----------------------------
    ai_analysis = relationship(
        "AlertAIAnalysis",
        back_populates="alert",
        uselist=False,
        cascade="all, delete-orphan",
    )


# ---------------------------
# Auth / IAM
# ---------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="USER")  # USER | SOC_ANALYST | ADMIN

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ---------------------------
# Detection Rules (Phase 5.1)
# ---------------------------

class DetectionRule(Base):
    __tablename__ = "detection_rules"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)

    mitre_tactic = Column(String)
    mitre_technique = Column(String)

    default_severity = Column(String)      # LOW | MEDIUM | HIGH | CRITICAL
    engine = Column(String, default="SCRIEM")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ---------------------------
# IOC Intelligence (Phase 5.4)
# ---------------------------

class IOC(Base):
    __tablename__ = "iocs"

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String, index=True)     # ip | domain | hash
    value = Column(String, index=True)    # actual IOC value

    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("kind", "value", name="uq_ioc_kind_value"),
    )


class EventIOC(Base):
    __tablename__ = "event_iocs"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), index=True)
    ioc_id = Column(Integer, ForeignKey("iocs.id"), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("event_id", "ioc_id", name="uq_event_ioc"),
    )


class AlertIOC(Base):
    __tablename__ = "alert_iocs"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), index=True)
    ioc_id = Column(Integer, ForeignKey("iocs.id"), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("alert_id", "ioc_id", name="uq_alert_ioc"),
    )
