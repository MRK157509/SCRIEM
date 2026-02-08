from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Event, Alert

from app.security import get_current_user  # ✅ JWT auth

router = APIRouter(prefix="/timeline", tags=["Timeline"])


# --------------------------
# Role-based serialization
# --------------------------
def _event_to_dict(e: Event, include_details: bool) -> dict:
    return {
        "id": e.id,
        "event_id": e.event_id,
        "event_type": e.event_type,
        "host": e.host,
        "user": e.user,
        "action": e.action,
        # USER should not see raw payload
        "details": e.details if include_details else None,
        "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


def _alert_to_dict(a: Alert, role: str) -> dict:
    # USER: hide rule_name (internals), keep notes so they can contribute
    rule_name = a.rule_name if role in ("ADMIN", "SOC_ANALYST") else None

    return {
        "id": a.id,
        "event_id": a.event_id,
        "title": a.title,
        "severity": a.severity,
        "status": a.status,
        "description": a.description,
        "host": a.host,
        "rule_name": rule_name,
        "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# --------------------------
# Global search  ✅ MUST COME FIRST
# --------------------------
@router.get("/search")
def search_timeline(
    q: str = Query("", min_length=1),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    caller: dict = Depends(get_current_user),
):
    query = q.strip()

    include_details = caller["role"] in ("ADMIN", "SOC_ANALYST")

    events = (
        db.query(Event)
        .filter(
            or_(
                Event.event_type.ilike(f"%{query}%"),
                Event.host.ilike(f"%{query}%"),
                Event.user.ilike(f"%{query}%"),
                Event.action.ilike(f"%{query}%"),
            )
        )
        .order_by(Event.id.desc())
        .limit(limit)
        .all()
    )

    alerts = (
        db.query(Alert)
        .filter(
            or_(
                Alert.title.ilike(f"%{query}%"),
                Alert.host.ilike(f"%{query}%"),
                Alert.severity.ilike(f"%{query}%"),
                Alert.status.ilike(f"%{query}%"),
                Alert.description.ilike(f"%{query}%"),
                # Only analysts/admin should be able to search rule_name
                *( [Alert.rule_name.ilike(f"%{query}%")] if caller["role"] in ("ADMIN","SOC_ANALYST") else [] ),
                # notes are allowed to be searched by all roles (collaboration)
                Alert.notes.ilike(f"%{query}%"),
            )
        )
        .order_by(Alert.id.desc())
        .limit(limit)
        .all()
    )

    return {
        "host": "search",
        "events": [_event_to_dict(e, include_details=include_details) for e in events],
        "alerts": [_alert_to_dict(a, role=caller["role"]) for a in alerts],
    }


# --------------------------
# Host timeline (by host)
# --------------------------
@router.get("/{host}")
def get_timeline(
    host: str,
    db: Session = Depends(get_db),
    caller: dict = Depends(get_current_user),
):
    include_details = caller["role"] in ("ADMIN", "SOC_ANALYST")

    events = (
        db.query(Event)
        .filter(Event.host == host)
        .order_by(Event.id.desc())
        .limit(200)
        .all()
    )

    alerts = (
        db.query(Alert)
        .filter(Alert.host == host)
        .order_by(Alert.id.desc())
        .limit(200)
        .all()
    )

    return {
        "host": host,
        "events": [_event_to_dict(e, include_details=include_details) for e in events],
        "alerts": [_alert_to_dict(a, role=caller["role"]) for a in alerts],
    }
