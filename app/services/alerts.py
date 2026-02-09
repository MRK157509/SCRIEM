from sqlalchemy.orm import Session

from app.models import Alert, DetectionRule
from app.services.iocs import extract_iocs, link_iocs_to_alert


ALLOWED_STATUSES = {"OPEN", "TRIAGED", "ESCALATED", "CLOSED"}


def create_alert_from_rule(
    db: Session,
    *,
    event,
    rule: DetectionRule,
    status: str = "OPEN",
    override_severity: str | None = None,
    override_title: str | None = None,
    override_description: str | None = None,
) -> Alert:
    """
    Single, stable alert creation contract.
    Future modules (SOAR, AI, Threat Intel) should create alerts ONLY via this function.

    - Persists alert
    - Links IOCs to the alert (Phase 5.4)
    - Returns SQLAlchemy Alert model
    """

    st = (status or "OPEN").upper()
    if st not in ALLOWED_STATUSES:
        st = "OPEN"

    sev = override_severity or rule.default_severity
    title = override_title or rule.name
    desc = override_description or rule.description

    alert = Alert(
        title=title,
        description=desc,
        severity=sev,
        status=st,
        rule_id=rule.id,
        rule_name=rule.name,   # keep for compatibility/UI; RBAC redaction handles masking
        host=getattr(event, "host", None),
        event_id=getattr(event, "id", None),
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Link IOCs from the triggering event to this alert
    try:
        details = getattr(event, "details", None)
        ex = extract_iocs(details)
        link_iocs_to_alert(db, alert.id, ex)
    except Exception:
        # IOC linking should never crash alert creation
        pass

    return alert
