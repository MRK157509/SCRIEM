import os

API_KEY = "scriem-secret-key"
JWT_SECRET = "CHANGE_ME_SUPER_SECRET_DEV"
JWT_ALGORITHM = "HS256"

AI_LLM_ENABLED = os.getenv("AI_LLM_ENABLED", "false").lower().strip() == "true"
AI_LLM_PROVIDER = os.getenv("AI_LLM_PROVIDER", "openai").strip()
AI_LLM_MODEL = os.getenv("AI_LLM_MODEL", "gpt-4o-mini").strip()
AI_LLM_API_KEY = os.getenv("AI_LLM_API_KEY", "").strip()
AI_LLM_TIMEOUT_SECONDS = int(os.getenv("AI_LLM_TIMEOUT_SECONDS", "20"))

if AI_LLM_ENABLED and not AI_LLM_API_KEY:
    raise RuntimeError("AI_LLM_ENABLED=true but AI_LLM_API_KEY is empty")
