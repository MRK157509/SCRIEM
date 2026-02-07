from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app import models

router = APIRouter(prefix="/alerts", tags=["alerts"])


# -----------------------------
# Schemas
# -----------------------------

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


# -----------------------------
# Routes
# -----------------------------

@router.get("/")
def list_alerts(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Alert)
    if status:
        query = query.filter(models.Alert.status == status)
    return query.all()


@router.patch("/{alert_id}")
def update_alert(alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Validate status values (SOC lifecycle)
    valid_statuses = {"OPEN", "TRIAGED", "ESCALATED", "CLOSED"}

    if payload.status:
        new_status = payload.status.upper()
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid status value")
        alert.status = new_status

    if payload.notes is not None:
        alert.notes = payload.notes

    db.commit()
    db.refresh(alert)

    return alert
