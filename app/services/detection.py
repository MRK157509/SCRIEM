from sqlalchemy.orm import Session
from app import models

def run_detection(event: models.Event, db: Session):
    # Rule 1: Failed login
    if event.event_type == "login" and event.action == "failed_password":
        create_alert(
            title="Failed login detected",
            severity="LOW",
            description=f"User {event.user} failed login on {event.host}",
            db=db
        )

    # Rule 2: Malware execution
    if event.event_type == "process" and "malware" in event.action.lower():
        create_alert(
            title="Malware execution",
            severity="HIGH",
            description=f"Suspicious process on {event.host}",
            db=db
        )


def create_alert(title, severity, description, db):
    alert = models.Alert(
        title=title,
        severity=severity,
        description=description
    )
    db.add(alert)
    db.commit()
