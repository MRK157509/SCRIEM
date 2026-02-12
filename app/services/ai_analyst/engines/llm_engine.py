# app/services/ai_analyst/engines/llm_engine.py
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from pydantic import ValidationError

from app.config import (
    AI_LLM_API_KEY,
    AI_LLM_MODEL,
    AI_LLM_TIMEOUT_SECONDS,
)

from ..schemas import AIAnalysisInput, AIAnalysisResult


class LLMEngineError(Exception):
    pass


class LLMEngine:
    def __init__(self, enabled: bool, prompt_path: Optional[str] = None):
        self.enabled = enabled
        self.prompt_path = prompt_path or str(
            Path(__file__).resolve().parent.parent / "prompts" / "base_prompt.txt"
        )

    def _load_prompt(self) -> str:
        return Path(self.prompt_path).read_text(encoding="utf-8")

    def analyze(self, payload: AIAnalysisInput) -> AIAnalysisResult:
        if not self.enabled:
            raise LLMEngineError("LLM engine disabled")
        if not AI_LLM_API_KEY:
            raise LLMEngineError("AI_LLM_API_KEY missing")

        # Import here to avoid import-time failures if SDK not installed
        from openai import OpenAI

        client = OpenAI(api_key=AI_LLM_API_KEY)

        system_prompt = self._load_prompt()

        # Keep user content compact + structured
        user_content = json.dumps(payload.model_dump(), ensure_ascii=False)

        try:
            resp = client.chat.completions.create(
                model=AI_LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.2,
                timeout=AI_LLM_TIMEOUT_SECONDS,
            )
        except Exception as e:
            raise LLMEngineError(f"LLM request failed: {e}")

        raw = resp.choices[0].message.content or ""
        return self.parse_json_to_result(raw)

    @staticmethod
    def parse_json_to_result(raw: str) -> AIAnalysisResult:
        # Hard JSON enforcement (strip accidental code fences)
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`").strip()
        try:
            data = json.loads(text)
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
