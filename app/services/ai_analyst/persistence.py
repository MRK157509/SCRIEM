# app/services/ai_analyst/persistence.py
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.alert_ai_analysis import AlertAIAnalysis
from app.services.ai_analyst.schemas import AIAnalysisResult


def _to_csv(items: list[str]) -> str:
    return ",".join([x.strip() for x in items if x and x.strip()])


def _to_lines(items: list[str]) -> str:
    return "\n".join([x.strip() for x in items if x and x.strip()])


def upsert_ai_analysis(db: Session, alert_id: int, result: AIAnalysisResult) -> AlertAIAnalysis:
    # -------------------------
    # HARD GUARD (debug-proof)
    # -------------------------
    if not hasattr(result, "risk_level"):
        raise TypeError(
            "upsert_ai_analysis expected AIAnalysisResult, but got: "
            f"{type(result).__name__}. "
            "This usually means you passed the AIAnalyst instance instead of analyst.analyze(payload)."
        )

    row = db.query(AlertAIAnalysis).filter(AlertAIAnalysis.alert_id == alert_id).one_or_none()

    risk_level_str = result.risk_level.value if hasattr(result.risk_level, "value") else str(result.risk_level)

    if row is None:
        row = AlertAIAnalysis(
            alert_id=alert_id,
            summary=result.summary,
            risk_level=risk_level_str,
            confidence=result.confidence,
            reasoning=result.reasoning,
            mitre_techniques=_to_csv(result.mitre_techniques),
            false_positive_probability=result.false_positive_probability,
            recommended_actions=_to_lines(result.recommended_actions),
            engine_used=result.engine_used,
            generated_at=result.generated_at,
        )
        db.add(row)
    else:
        row.summary = result.summary
        row.risk_level = risk_level_str
        row.confidence = result.confidence
        row.reasoning = result.reasoning
        row.mitre_techniques = _to_csv(result.mitre_techniques)
        row.false_positive_probability = result.false_positive_probability
        row.recommended_actions = _to_lines(result.recommended_actions)
        row.engine_used = result.engine_used
        row.generated_at = result.generated_at

    db.commit()
    db.refresh(row)
    return row


def row_to_dict(row: AlertAIAnalysis) -> dict:
    mitre = [x.strip() for x in (row.mitre_techniques or "").split(",") if x.strip()]
    actions = [x.strip() for x in (row.recommended_actions or "").splitlines() if x.strip()]
    return {
        "alert_id": row.alert_id,
        "summary": row.summary,
        "risk_level": row.risk_level,
        "confidence": row.confidence,
        "reasoning": row.reasoning,
        "mitre_techniques": mitre,
        "false_positive_probability": row.false_positive_probability,
        "recommended_actions": actions,
        "engine_used": row.engine_used,
        "generated_at": row.generated_at,
    }
