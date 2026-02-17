# app/routers/events.py

from typing import Optional, List, Any, Dict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.database import SessionLocal
from app.security import require_agent_token

from app.models_legacy import Event
from app.services.detection import evaluate_event, evaluate_events

router = APIRouter(prefix="/events", tags=["events"])


# ---------------- DB dependency ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------- Incoming schemas (flexible) ----------------
class EventIn(BaseModel):
    host: Optional[str] = None
    user: Optional[str] = None

    event_type: Optional[str] = None
    action: Optional[str] = None

    message: Optional[str] = None
    details: Optional[str] = None  # allow both
    ip: Optional[str] = None
    src_ip: Optional[str] = None
    dest_ip: Optional[str] = None

    timestamp: Optional[str] = None  # accept iso string if provided

    class Config:
        extra = "allow"


class BatchIn(BaseModel):
    events: List[Dict[str, Any]]


def _now_utc():
    return datetime.now(timezone.utc)


def _pick_details(payload: EventIn) -> str:
    # prefer explicit details, otherwise message, otherwise empty
    if payload.details:
        return str(payload.details)
    if payload.message:
        return str(payload.message)
    # if extra fields exist, keep a minimal signal
    return ""


def _parse_timestamp(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    # tolerate iso strings; if parsing fails, ignore
    try:
        # Handles "2026-02-01T15:09:03.990807" etc.
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return None


# ---------------- Routes ----------------

@router.post("", dependencies=[Depends(require_agent_token)])
def ingest_event(payload: EventIn, db=Depends(get_db)):
    """
    Production ingest:
    1) Store event
    2) Run detection rules against this event
    3) Create alerts (if any)
    """
    e = Event(
        host=payload.host or "unknown-host",
        user=payload.user or "unknown-user",
        event_type=(payload.event_type or "").strip().lower(),
        action=(payload.action or "").strip().lower(),
        details=_pick_details(payload),
        timestamp=_parse_timestamp(payload.timestamp),
        created_at=_now_utc(),
    )

    db.add(e)
    db.commit()
    db.refresh(e)

    created_alert_ids = evaluate_event(db, e)
    db.commit()

    return {
        "status": "stored",
        "event_id": e.id,
        "alerts_created": len(created_alert_ids),
        "alert_ids": created_alert_ids,
    }


@router.post("/batch", dependencies=[Depends(require_agent_token)])
def ingest_events_batch(payload: BatchIn, db=Depends(get_db)):
    """
    Batch ingest:
    1) Store all events
    2) Run detection on all of them
    """
    event_rows: List[Event] = []

    for raw in payload.events:
        # raw is dict; map to EventIn so we keep same normalization rules
        obj = EventIn(**raw)

        e = Event(
            host=obj.host or "unknown-host",
            user=obj.user or "unknown-user",
            event_type=(obj.event_type or "").strip().lower(),
            action=(obj.action or "").strip().lower(),
            details=_pick_details(obj),
            timestamp=_parse_timestamp(obj.timestamp),
            created_at=_now_utc(),
        )
        db.add(e)
        event_rows.append(e)

    db.commit()

    # refresh ids
    for e in event_rows:
        db.refresh(e)

    alerts_created = evaluate_events(db, event_rows)
    db.commit()

    return {
        "status": "stored_batch",
        "count": len(event_rows),
        "alerts_created": alerts_created,
        "events": [{"event_id": e.id} for e in event_rows],
    }


@router.get("", dependencies=[Depends(require_agent_token)])
def get_events(limit: int = 200, db=Depends(get_db)):
    rows = db.query(Event).order_by(Event.id.desc()).limit(limit).all()
    return {"events": rows}
