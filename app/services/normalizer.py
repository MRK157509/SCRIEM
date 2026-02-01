from datetime import datetime, timezone

def normalize_event(raw: dict) -> dict:
    """
    Converts different raw event shapes into SCRIEM standard schema.
    """
    return {
        "event_type": raw.get("event_type", "unknown"),
        "host": raw.get("host", "unknown-host"),
        "user": raw.get("user", "unknown-user"),
        "action": raw.get("action", "unknown-action"),
        "details": raw.get("details", {}),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
