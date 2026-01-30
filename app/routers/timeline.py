from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Event, Alert

router = APIRouter(prefix="/timeline", tags=["Timeline"])

@router.get("/{host}")
def get_timeline(host: str, db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.host == host).all()
    alerts = db.query(Alert).filter(Alert.host == host).all()

    return {
        "host": host,
        "events": events,
        "alerts": alerts
    }
