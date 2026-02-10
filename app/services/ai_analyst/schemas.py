# app/services/ai_analyst/schemas.py
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class RiskLevel(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class AIAnalysisInput(BaseModel):
    """
    Normalized input for AI analysis.
    Keep this close to your Phase 5 'Alert Contract' structure.

    You can pass the entire alert JSON into `alert`.
    """
    alert_id: str = Field(..., min_length=1)
    alert: Dict[str, Any] = Field(default_factory=dict)
    enrichment: Optional[Dict[str, Any]] = None
    iocs: Optional[Dict[str, Any]] = None


class AIAnalysisResult(BaseModel):
    summary: str = Field(..., min_length=10, max_length=2000)
    risk_level: RiskLevel
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str = Field(..., min_length=10, max_length=4000)
    mitre_techniques: List[str] = Field(default_factory=list)
    false_positive_probability: float = Field(..., ge=0.0, le=1.0)
    recommended_actions: List[str] = Field(default_factory=list)

    engine_used: str = Field(..., pattern="^(llm|fallback)$")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("mitre_techniques")
    @classmethod
    def validate_mitre_ids(cls, v: List[str]) -> List[str]:
        # allow empty; if present, ensure looks like "Txxxx" or "Txxxx.xxx"
        cleaned: List[str] = []
        for t in v:
            t = (t or "").strip().upper()
            if not t:
                continue
            if not (t.startswith("T") and len(t) >= 5):
                continue
            cleaned.append(t)
        # de-dup while preserving order
        seen = set()
        out = []
        for t in cleaned:
            if t not in seen:
                seen.add(t)
                out.append(t)
        return out
