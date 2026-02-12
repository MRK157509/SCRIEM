# app/services/ai_analyst/analyzer.py
from __future__ import annotations

from dataclasses import dataclass

from .schemas import AIAnalysisInput, AIAnalysisResult
from .engines.fallback_engine import FallbackEngine


@dataclass
class AIAnalystConfig:
    # Keep config for future, but fallback-only for now
    llm_enabled: bool = False


class AIAnalyst:
    def __init__(self, config: AIAnalystConfig):
        self.config = config
        self.fallback = FallbackEngine()

    def analyze(self, payload: AIAnalysisInput) -> AIAnalysisResult:
        """
        Fallback-only mode (stable):
        - No LLM calls
        - No external dependency
        - Always returns AIAnalysisResult
        """
        result = self.fallback.analyze(payload)

        # Force engine_used consistently (pydantic v1/v2 safe)
        if hasattr(result, "model_copy"):  # pydantic v2
            return result.model_copy(update={"engine_used": "fallback"})
        if hasattr(result, "copy"):  # pydantic v1
            return result.copy(update={"engine_used": "fallback"})
        result.engine_used = "fallback"
        return result
