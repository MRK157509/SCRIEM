from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/")
def list_alerts(status: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Alert)
    if status:
        query = query.filter(models.Alert.status == status)
    return query.all()


@router.patch("/{alert_id}")
def update_alert(alert_id: int, status: str = None, notes: str = None, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()

    if not alert:
        return {"error": "Alert not found"}

    if status:
        alert.status = status
    if notes:
        alert.notes = notes

    db.commit()
    return alert
