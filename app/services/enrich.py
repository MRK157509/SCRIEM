from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models import Alert, Event, AlertIOC, IOC


def enrich_alert(db: Session, alert_dict: dict) -> dict:
    """
    Adds investigation context + IOC intelligence to an alert payload.
    Redaction/masking happens AFTER this (in redact_alert).
    """
    host = alert_dict.get("host")
    created_at = alert_dict.get("created_at")

    # Parse created_at (ISO)
    try:
        alert_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00")) if created_at else None
    except Exception:
        alert_dt = None

    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)

    # Counts / context
    alerts_on_host = db.query(Alert).filter(Alert.host == host).count() if host else 0
    recent_alerts_24h = db.query(Alert).filter(Alert.created_at >= since_24h).count()

    first_seen_host = None
    last_seen_host = None

    if host:
        first_e = (
            db.query(Event)
            .filter(Event.host == host)
            .order_by(Event.timestamp.asc())
            .first()
        )
        last_e = (
            db.query(Event)
            .filter(Event.host == host)
            .order_by(Event.timestamp.desc())
            .first()
        )
        if first_e and first_e.timestamp:
            first_seen_host = first_e.timestamp.isoformat()
        if last_e and last_e.timestamp:
            last_seen_host = last_e.timestamp.isoformat()

    related_events = []
    if host:
        evs = (
            db.query(Event)
            .filter(Event.host == host)
            .order_by(Event.timestamp.desc())
            .limit(8)
            .all()
        )
        related_events = [
            {
                "id": e.id,
                "event_type": e.event_type,
                "host": e.host,
                "user": e.user,
                "action": e.action,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            }
            for e in evs
        ]

    alert_dict["context"] = {
        "alerts_on_host": alerts_on_host,
        "recent_alerts_24h": recent_alerts_24h,
        "first_seen_host": first_seen_host,
        "last_seen_host": last_seen_host,
        "related_events": related_events,
    }

    # -----------------------------
    # IOC Intelligence (Phase 5.4)
    # -----------------------------
    alert_id = alert_dict.get("id")
    ioc_payload = {"ips": [], "domains": [], "hashes": []}
    ioc_hits = {"ip": 0, "domain": 0, "hash": 0}

    if alert_id:
        links = db.query(AlertIOC).filter(AlertIOC.alert_id == alert_id).all()
        if links:
            ioc_ids = [l.ioc_id for l in links]
            rows = db.query(IOC).filter(IOC.id.in_(ioc_ids)).all()

            for r in rows:
                if r.kind == "ip":
                    ioc_payload["ips"].append(r.value)
                elif r.kind == "domain":
                    ioc_payload["domains"].append(r.value)
                elif r.kind == "hash":
                    ioc_payload["hashes"].append(r.value)

                ioc_hits[r.kind] = ioc_hits.get(r.kind, 0) + 1

    alert_dict["iocs"] = ioc_payload
    alert_dict["ioc_hits"] = ioc_hits

    return alert_dict
