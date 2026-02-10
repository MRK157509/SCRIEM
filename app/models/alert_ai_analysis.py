# app/models/alert_ai_analysis.py
from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base  # ✅ matches your structure (database.py at app root)

from sqlalchemy import Integer


class AlertAIAnalysis(Base):
    __tablename__ = "alert_ai_analysis"
    __table_args__ = (UniqueConstraint("alert_id", name="uq_alert_ai_analysis_alert_id"),)


    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True)


    summary = Column(Text, nullable=False)
    risk_level = Column(String(16), nullable=False)  # Low|Medium|High|Critical
    confidence = Column(Float, nullable=False)

    reasoning = Column(Text, nullable=False)
    mitre_techniques = Column(Text, nullable=False, default="")  # CSV
    false_positive_probability = Column(Float, nullable=False)
    recommended_actions = Column(Text, nullable=False, default="")  # newline-separated

    engine_used = Column(String(16), nullable=False)  # llm|fallback
    generated_at = Column(DateTime, nullable=False)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Backref to Alert
    alert = relationship("Alert", back_populates="ai_analysis")
