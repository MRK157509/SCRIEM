from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
import logging
from typing import List, Optional

from app import models, schemas
from app.database import get_db
from app.services.detection import run_detection
from app.services.normalizer import normalize_event
from app.schemas import EventCreate
from app.config import API_KEY
from app.services.rate_limit import allow_request

from app.security import get_current_user  # ✅ JWT auth for UI reads

logger = logging.getLogger("scriem")
router = APIRouter(tags=["events"])


# -----------------------------
# Agent / Ingestion auth (API key)
# -----------------------------
def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


# -----------------------------
# Helpers: sanitize for USER
# -----------------------------
def _event_to_dict(e: models.Event, include_details: bool = True) -> dict:
    d = {
        "id": e.id,
        "event_id": e.event_id,
        "event_type": e.event_type,
        "host": e.host,
        "user": e.user,
        "action": e.action,
        "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
    if include_details:
        d["details"] = e.details
    else:
        d["details"] = None
    return d


# -----------------------------
# Ingestion endpoints (API key)
# -----------------------------
@router.post("/events")
def ingest_event(
    event: schemas.EventCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
):
    normalized = normalize_event(event.dict())

    logger.info(
        f"Event received from {normalized['host']}: {normalized['event_type']} {normalized['action']}"
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
    return {"status": "stored", "event_id": db_event.id}


@router.post("/events/batch")
def ingest_events_batch(
    events: List[EventCreate],
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
):
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


# -----------------------------
# UI read endpoints (JWT)
# -----------------------------
@router.get("/events")
def get_events(
    host: Optional[str] = None,
    user: Optional[str] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db),
    caller: dict = Depends(get_current_user),
):
    query = db.query(models.Event)

    if host:
        query = query.filter(models.Event.host == host)
    if user:
        query = query.filter(models.Event.user == user)
    if event_type:
        query = query.filter(models.Event.event_type == event_type)

    rows = query.order_by(models.Event.timestamp.desc()).all()

    # ADMIN + SOC_ANALYST get full details
    include_details = caller["role"] in ("ADMIN", "SOC_ANALYST")
    return [_event_to_dict(e, include_details=include_details) for e in rows]


@router.get("/timeline/{host}")
def host_timeline(
    host: str,
    db: Session = Depends(get_db),
    caller: dict = Depends(get_current_user),
):
    events = (
        db.query(models.Event)
        .filter(models.Event.host == host)
        .order_by(models.Event.timestamp.asc())
        .all()
    )

    include_details = caller["role"] in ("ADMIN", "SOC_ANALYST")
    return [_event_to_dict(e, include_details=include_details) for e in events]
