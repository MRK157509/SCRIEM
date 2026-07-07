from datetime import datetime, timezone
import secrets

from sqlalchemy import Column, DateTime, JSON, String, Text

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class CaseRecord(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, default="")
    severity = Column(String, default="MEDIUM", index=True)
    status = Column(String, default="OPEN", index=True)
    notes = Column(Text, default="")
    items = Column(JSON, nullable=False, default=list)
    timeline = Column(JSON, nullable=False, default=list)
    created_by = Column(String, default="")
    updated_by = Column(String, default="")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


def make_case_id() -> str:
    return f"case-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{secrets.token_hex(4)}"
