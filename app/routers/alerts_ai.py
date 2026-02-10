# app/routers/alerts_ai.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models_legacy import Alert
from app.models.alert_ai_analysis import AlertAIAnalysis

from app.services.ai_analyst.analyzer import AIAnalyst, AIAnalystConfig
from app.services.ai_analyst.schemas import AIAnalysisInput
from app.services.ai_analyst.persistence import upsert_ai_analysis, row_to_dict

router = APIRouter(prefix="/alerts", tags=["Alerts - AI Analysis"])


# Dependency (match your project style)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/{alert_id}/ai-analysis")
def get_ai_analysis(alert_id: int, db: Session = Depends(get_db)):
    # ensure alert exists
    alert = db.query(Alert).filter(Alert.id == alert_id).one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    row = db.query(AlertAIAnalysis).filter(AlertAIAnalysis.alert_id == alert_id).one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="AI analysis not found for this alert")

    return row_to_dict(row)


@router.post("/{alert_id}/ai-reanalyze")
def reanalyze_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Build a minimal payload from your alert fields (works even if no raw JSON is stored)
    payload = AIAnalysisInput(
        alert_id=str(alert.id),
        alert={
            "id": alert.id,
            "title": alert.title,
            "severity": alert.severity,
            "status": alert.status,
            "description": alert.description,
            "host": alert.host,
            "event_id": alert.event_id,
            "rule_id": getattr(alert, "rule_id", None),
            "rule_name": getattr(alert, "rule_name", None),
            "notes": getattr(alert, "notes", ""),
        },
        enrichment=None,
        iocs=None,
    )

    analyst = AIAnalyst(AIAnalystConfig(llm_enabled=False))  # Phase 6.3 enables/configures LLM safely
    result = analyst.analyze(payload)

    row = upsert_ai_analysis(db, alert_id=alert.id, result=result)
    return row_to_dict(row)
