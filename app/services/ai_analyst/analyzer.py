# app/services/ai_analyst/analyzer.py
from __future__ import annotations

from dataclasses import dataclass

from .schemas import AIAnalysisInput, AIAnalysisResult
from .engines.llm_engine import LLMEngine, LLMEngineError
from .engines.fallback_engine import FallbackEngine

from app.config import AI_LLM_ENABLED

@dataclass
class AIAnalystConfig:
    llm_enabled: bool = AI_LLM_ENABLED

class AIAnalyst:
    def __init__(self, config: AIAnalystConfig):
        self.config = config
        self.llm = LLMEngine(enabled=config.llm_enabled)
        self.fallback = FallbackEngine()

    def analyze(self, payload: AIAnalysisInput) -> AIAnalysisResult:
        # A) Try LLM
        try:
            result = self.llm.analyze(payload)
            # ensure engine_used is correct if provider returns schema without it
            return result.model_copy(update={"engine_used": "llm"})
        except LLMEngineError:
            # B) Always fallback
            return self.fallback.analyze(payload)
        except Exception:
            # never break alert pipeline due to AI
            return self.fallback.analyze(payload)
