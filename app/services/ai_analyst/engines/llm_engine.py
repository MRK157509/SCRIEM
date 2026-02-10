# app/services/ai_analyst/engines/llm_engine.py
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from ..schemas import AIAnalysisInput, AIAnalysisResult
from pydantic import ValidationError


class LLMEngineError(Exception):
    pass


class LLMEngine:
    """
    External AI engine placeholder.

    In Phase 6.2/6.3 we will:
    - Add a provider client (OpenAI / local LLM / etc.)
    - Enforce JSON-only response + schema validation
    - Add retry/backoff/timeouts and audit logs
    """

    def __init__(self, enabled: bool, prompt_path: Optional[str] = None):
        self.enabled = enabled
        self.prompt_path = prompt_path or str(
            Path(__file__).resolve().parent.parent / "prompts" / "base_prompt.txt"
        )

    def analyze(self, payload: AIAnalysisInput) -> AIAnalysisResult:
        if not self.enabled:
            raise LLMEngineError("LLM engine disabled")

        # Phase 6.1: we intentionally raise until provider is wired.
        # This forces the hybrid analyzer to use fallback unless enabled + implemented later.
        raise LLMEngineError("LLM provider not configured yet (Phase 6.2 will implement)")

    @staticmethod
    def parse_json_to_result(raw: str) -> AIAnalysisResult:
        try:
            data = json.loads(raw)
        except Exception as e:
            raise LLMEngineError(f"Invalid JSON from LLM: {e}")

        try:
            result = AIAnalysisResult(
                **data,
                engine_used="llm",
            )
        except ValidationError as e:
            raise LLMEngineError(f"LLM output failed schema validation: {e}")

        return result
