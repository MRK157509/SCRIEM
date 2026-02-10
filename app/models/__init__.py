# app/models/__init__.py

"""
Compatibility layer:
- Keep old imports working: `from app.models import Alert, Event, IOC, DetectionRule, ...`
- Register new modular models (Phase 6) stored in app/models/
"""

# ---- legacy models (the old app/models.py, now app/models_legacy.py) ----
from app import models_legacy as _legacy

# Explicit re-exports (prevents wildcard issues / tooling confusion)
Alert = _legacy.Alert
Event = _legacy.Event
IOC = _legacy.IOC
EventIOC = _legacy.EventIOC
AlertIOC = _legacy.AlertIOC
DetectionRule = _legacy.DetectionRule
User = getattr(_legacy, "User", None)  # if exists

# Export Base only if you truly kept it there (you use app.database.Base anyway)
Base = getattr(_legacy, "Base", None)

# ---- new modular models (Phase 6) ----
from app.models.alert_ai_analysis import AlertAIAnalysis  # noqa: F401

__all__ = [
    "Alert",
    "Event",
    "IOC",
    "EventIOC",
    "AlertIOC",
    "DetectionRule",
    "User",
    "Base",
    "AlertAIAnalysis",
]
