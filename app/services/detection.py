from sqlalchemy.orm import Session

from app.models import DetectionRule
from app.services.alerts import create_alert_from_rule


def get_rule_by_name(db: Session, name: str):
    return db.query(DetectionRule).filter(DetectionRule.name == name).first()


def run_detection(event, db: Session):
    """
    Rule-driven detection engine (Phase 5.2) now uses the alert contract (Phase 5.6).
    """
    rule = None

    # -----------------------------
    # Detection logic (expand later)
    # -----------------------------

    if event.event_type == "login_failed":
        rule = get_rule_by_name(db, "Multiple Failed Logins")

    elif (
        event.event_type == "process_start"
        and isinstance(event.details, dict)
        and "powershell" in str(event.details.get("process", "")).lower()
    ):
        rule = get_rule_by_name(db, "Suspicious Process Execution")

    elif event.event_type == "privilege_escalation":
        rule = get_rule_by_name(db, "Privilege Escalation Attempt")

    if not rule:
        return None  # no match

    # ✅ Single contract call (this is the point of Phase 5.6)
    alert = create_alert_from_rule(db, event=event, rule=rule, status="OPEN")
    return alert
