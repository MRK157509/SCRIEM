from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.database import get_db
from app import models
from app.security import get_current_user, require_role

router = APIRouter(prefix="/alerts", tags=["alerts"])

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

def audit(db: Session, user: dict, action: str, target_type: str, target_id: str, details: dict):
    row = models.AuditLog(
        actor_username=user.get("username"),
        actor_role=user.get("role"),
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        details=details or {},
    )
    db.add(row)
    db.commit()

def sanitize_alert_for_user(alert: models.Alert) -> dict:
    # USER: keep experience high but avoid internals like rule_name
    return {
        "id": alert.id,
        "title": alert.title,
        "severity": alert.severity,
        "status": alert.status,
        "description": alert.description,
        "host": alert.host,
        "event_id": alert.event_id,
        "created_at": alert.created_at,
        # notes are allowed for USER (they contribute)
        "notes": alert.notes or "",
        # hide internals
        "rule_name": None,
    }

@router.get("/")
def list_alerts(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    query = db.query(models.Alert)
    if status:
        query = query.filter(models.Alert.status == status)
    rows = query.all()

    # ADMIN + SOC_ANALYST get full rows
    if user["role"] in ("ADMIN", "SOC_ANALYST"):
        return rows

    # USER gets sanitized
    return [sanitize_alert_for_user(a) for a in rows]

@router.patch("/{alert_id}")
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    valid_statuses = {"OPEN", "TRIAGED", "ESCALATED", "CLOSED"}

    # ✅ USER can update NOTES, but cannot change STATUS
    if payload.status is not None:
        if user["role"] not in ("SOC_ANALYST", "ADMIN"):
            raise HTTPException(status_code=403, detail="USER cannot change status")
        new_status = payload.status.upper()
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid status value")
        old_status = alert.status
        alert.status = new_status
        db.commit()
        db.refresh(alert)

        audit(
            db,
            user,
            action="ALERT_STATUS_UPDATE",
            target_type="ALERT",
            target_id=str(alert_id),
            details={"from": old_status, "to": new_status},
        )

    # ✅ All roles (including USER) can update notes
    if payload.notes is not None:
        old_notes = alert.notes or ""
        alert.notes = payload.notes
        db.commit()
        db.refresh(alert)

        audit(
            db,
            user,
            action="ALERT_NOTES_UPDATE",
            target_type="ALERT",
            target_id=str(alert_id),
            details={"length_before": len(old_notes), "length_after": len(payload.notes or "")},
        )

    # Return filtered response for USER
    if user["role"] == "USER":
        return sanitize_alert_for_user(alert)

    return alert

@router.get("/{alert_id}/raw", dependencies=[Depends(require_role("ADMIN"))])
def get_alert_raw(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
