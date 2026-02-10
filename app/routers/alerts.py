from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

from app.services.authz import require_principal
from app.services.redact import redact_alert
from app.services.enrich import enrich_alert

from sqlalchemy.orm import relationship


router = APIRouter(prefix="/alerts", tags=["alerts"])

ALLOWED_STATUSES = {"OPEN", "TRIAGED", "ESCALATED", "CLOSED"}


def _alert_to_dict(a: models.Alert) -> dict:
    return {
        "id": a.id,
        "event_id": a.event_id,
        "title": a.title,
        "severity": a.severity,
        "status": a.status,
        "description": a.description,
        "host": a.host,
        "rule_id": getattr(a, "rule_id", None),
        "rule_name": a.rule_name,
        "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        # Optional: if you later add Alert.user, include here
        # "user": a.user,
    }


@router.get("/")
def list_alerts(
    status: str = None,
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    role = principal["role"]
    query = db.query(models.Alert)
    if status:
        query = query.filter(models.Alert.status == status)

    alerts = query.order_by(models.Alert.id.desc()).all()

    out = []
    for a in alerts:
        d = _alert_to_dict(a)

        # ✅ Enrich first (adds context fields)
        d = enrich_alert(db, d)

        # ✅ Then redact based on role (so USER doesn't get sensitive fields)
        d = redact_alert(d, role)

        out.append(d)

    return out


@router.patch("/{alert_id}")
def update_alert(
    alert_id: int,
    status: str = None,
    notes: str = None,
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    role = principal["role"]

    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Notes: allowed for all roles
    if notes is not None:
        alert.notes = notes

    # Status RBAC
    if status is not None:
        status_up = status.upper()
        if status_up not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")

        if role == "USER":
            # USER limited: can only set TRIAGED
            if status_up != "TRIAGED":
                raise HTTPException(status_code=403, detail="USER can only TRIAGE alerts")

        alert.status = status_up

    db.commit()
    db.refresh(alert)

    d = _alert_to_dict(alert)
    d = enrich_alert(db, d)
    return redact_alert(d, role)
