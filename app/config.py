import os

API_KEY = "scriem-secret-key"
JWT_SECRET = "CHANGE_ME_SUPER_SECRET_DEV"
JWT_ALGORITHM = "HS256"

AI_LLM_ENABLED = os.getenv("AI_LLM_ENABLED", "false").lower() == "true"
AI_LLM_PROVIDER = os.getenv("AI_LLM_PROVIDER", "openai")  # future-proof
AI_LLM_MODEL = os.getenv("AI_LLM_MODEL", "gpt-4o-mini")
AI_LLM_API_KEY = os.getenv("AI_LLM_API_KEY", "")
AI_LLM_TIMEOUT_SECONDS = int(os.getenv("AI_LLM_TIMEOUT_SECONDS", "20"))
