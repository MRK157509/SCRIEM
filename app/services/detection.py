from sqlalchemy.orm import Session

from app.models import Alert, DetectionRule
from app.services.iocs import extract_iocs, link_iocs_to_alert


def get_rule_by_name(db: Session, name: str):
    return db.query(DetectionRule).filter(DetectionRule.name == name).first()


def run_detection(event, db: Session):
    """
    Rule-driven detection engine (Phase 5.2) + IOC linking (Phase 5.4)
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
        return  # no match

    alert = Alert(
        title=rule.name,
        description=rule.description,
        severity=rule.default_severity,
        rule_id=rule.id,
        host=event.host,
        event_id=event.id,
        status="OPEN",
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    # -----------------------------
    # IOC Linking (Phase 5.4)
    # -----------------------------
    ex = extract_iocs(event.details)
    link_iocs_to_alert(db, alert.id, ex)
