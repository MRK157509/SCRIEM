from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
import logging

from app import models, schemas
from app.database import get_db
from app.services.detection import run_detection
from app.services.normalizer import normalize_event
from typing import List
from app.schemas import EventCreate
from app.config import API_KEY
from app.services.rate_limit import allow_request

logger = logging.getLogger("scriem")
router = APIRouter()

def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


@router.post("/events")
def ingest_event(event: schemas.EventCreate, db: Session = Depends(get_db),api_key: str = Depends(verify_api_key)):
    normalized = normalize_event(event.dict())

    logger.info(
        f"Event received from {normalized['host']}: {normalized['event_type']} {normalized['action']}")

    if not allow_request(normalized["host"]):
       raise HTTPException(status_code=429, detail="Rate limit exceeded")

    db_event = models.Event(
        event_type=normalized["event_type"],
        host=normalized["host"],
        user=normalized["user"],
        action=normalized["action"],
        details=normalized["details"]
    )

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    run_detection(db_event, db)
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


@router.post("/events/batch")
def ingest_events_batch(events: List[EventCreate], db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    stored = []
    for e in events:
        normalized = normalize_event(e.dict())

        logger.info(
             f"[BATCH] Event from {normalized['host']}: {normalized['event_type']} {normalized['action']}"
             )

        if not allow_request(normalized["host"]):
           raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
        db_event = models.Event(
            event_type=normalized["event_type"],
            host=normalized["host"],
            user=normalized["user"],
            action=normalized["action"],
            details=normalized["details"],
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        run_detection(db_event, db)
        stored.append({"event_id": db_event.id})

    return {"status": "stored_batch", "count": len(stored), "events": stored}

def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    

