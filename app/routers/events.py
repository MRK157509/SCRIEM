from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.post("/events")
def ingest_event(event: schemas.EventCreate, db: Session = Depends(get_db)):
    db_event = models.Event(
        event_type=event.event_type,
        host=event.host,
        user=event.user,
        action=event.action,
        details=event.details
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return {"status": "stored", "event_id": db_event.id}

from typing import Optional

@router.get("/events")
def get_events(
    host: Optional[str] = None,
    user: Optional[str] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Event)

    if host:
        query = query.filter(models.Event.host == host)
    if user:
        query = query.filter(models.Event.user == user)
    if event_type:
        query = query.filter(models.Event.event_type == event_type)

    return query.order_by(models.Event.timestamp.desc()).all()

@router.get("/timeline/{host}")
def host_timeline(host: str, db: Session = Depends(get_db)):
    events = (
        db.query(models.Event)
        .filter(models.Event.host == host)
        .order_by(models.Event.timestamp.asc())
        .all()
    )
    return events
