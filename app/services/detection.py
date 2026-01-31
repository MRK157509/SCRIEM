from sqlalchemy.orm import Session
from app import models
from datetime import datetime, timedelta, timezone


def run_detection(event: models.Event, db: Session):
    # Rule 1: Failed login
    if event.event_type == "login" and event.action == "failed_password":
        create_alert(
            title="Failed login detected",
            severity="LOW",
            description=f"User {event.user} failed login on {event.host}",
            host=event.host,
            event_id=event.id,
            db=db
        )

    # Rule 2: Malware execution
    if event.event_type == "process" and "malware" in event.action.lower():
        create_alert(
            title="Malware execution",
            severity="HIGH",
            description=f"Suspicious process on {event.host}",
            host=event.host,
            event_id=event.id,
            db=db
        )

        # 🔥 Correlation Rule: Brute Force + Execution
    five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)

    recent_events = db.query(models.Event).filter(
        models.Event.host == event.host,
        models.Event.created_at >= five_minutes_ago
    ).all()

    failed_logins = [e for e in recent_events if e.event_type == "login" and "failed" in (e.action or "")]
    successful_logins = [e for e in recent_events if e.event_type == "login" and "success" in (e.action or "")]
    malware_execs = [e for e in recent_events if e.event_type == "process" and "malware" in (e.action or "").lower()]

    if len(failed_logins) >= 3 and successful_logins and malware_execs:
        create_alert(
            title="Possible Account Compromise + Malware Execution",
            severity="CRITICAL",
            description=f"Multiple failed logins followed by compromise and malware on {event.host}",
            host=event.host,
            event_id=event.id,
            db=db
        )
 


def create_alert(title: str, severity: str, description: str, host: str, event_id: int, db: Session):
    alert = models.Alert(
        title=title,
        severity=severity,
        description=description,
        host=host,
        event_id=event_id,
    )
    db.add(alert)
    db.commit()
