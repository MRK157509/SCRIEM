import os

def _get(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()

# Database
DATABASE_URL = _get("DATABASE_URL", "sqlite:///./data/scriem.sqlite3")

# JWT (UI auth)
JWT_SECRET = _get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = _get("JWT_ALGORITHM", "HS256")

# CORS
# Comma-separated list for docker, e.g. "http://localhost:8080,http://127.0.0.1:8080"
ALLOW_ORIGINS = [o.strip() for o in _get("ALLOW_ORIGINS", "").split(",") if o.strip()]

# Runtime
APP_ENV = _get("APP_ENV", "development")
LOG_LEVEL = _get("LOG_LEVEL", "INFO")
