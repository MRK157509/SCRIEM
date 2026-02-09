import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models import IOC, EventIOC, AlertIOC


IP_RE = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"
)
DOMAIN_RE = re.compile(
    r"\b(?!(?:https?:\/\/))(?:(?:[a-z0-9-]{1,63}\.)+(?:[a-z]{2,24}))\b",
    re.I
)
HASH_RE = re.compile(
    r"\b[a-f0-9]{32}\b|\b[a-f0-9]{40}\b|\b[a-f0-9]{64}\b",
    re.I
)


def extract_iocs(obj) -> dict:
    """
    Extract ips/domains/hashes from a nested payload (dict/json/anything).
    """
    try:
        raw = str(obj)
    except Exception:
        raw = ""

    ips = set(IP_RE.findall(raw))
    domains = set(DOMAIN_RE.findall(raw))
    hashes = set(HASH_RE.findall(raw))

    return {
        "ips": sorted(ips),
        "domains": sorted(domains),
        "hashes": sorted(hashes),
    }


def _upsert_ioc(db: Session, kind: str, value: str) -> IOC:
    now = datetime.now(timezone.utc)
    row = db.query(IOC).filter(IOC.kind == kind, IOC.value == value).first()

    if row:
        row.last_seen = now
        return row

    row = IOC(kind=kind, value=value, first_seen=now, last_seen=now)
    db.add(row)

    try:
        db.flush()  # assign id without committing outer transaction
        return row
    except IntegrityError:
        db.rollback()
        return db.query(IOC).filter(IOC.kind == kind, IOC.value == value).first()


def link_iocs_to_event(db: Session, event_id: int, extracted: dict):
    """
    Persist IOCs and link them to the given event.
    """
    try:
        for ip in extracted.get("ips", []):
            ioc = _upsert_ioc(db, "ip", ip)
            db.add(EventIOC(event_id=event_id, ioc_id=ioc.id))

        for d in extracted.get("domains", []):
            ioc = _upsert_ioc(db, "domain", d)
            db.add(EventIOC(event_id=event_id, ioc_id=ioc.id))

        for h in extracted.get("hashes", []):
            ioc = _upsert_ioc(db, "hash", h)
            db.add(EventIOC(event_id=event_id, ioc_id=ioc.id))

        db.commit()
    except IntegrityError:
        db.rollback()
        db.commit()


def link_iocs_to_alert(db: Session, alert_id: int, extracted: dict):
    """
    Persist IOCs and link them to the given alert.
    """
    try:
        for ip in extracted.get("ips", []):
            ioc = _upsert_ioc(db, "ip", ip)
            db.add(AlertIOC(alert_id=alert_id, ioc_id=ioc.id))

        for d in extracted.get("domains", []):
            ioc = _upsert_ioc(db, "domain", d)
            db.add(AlertIOC(alert_id=alert_id, ioc_id=ioc.id))

        for h in extracted.get("hashes", []):
            ioc = _upsert_ioc(db, "hash", h)
            db.add(AlertIOC(alert_id=alert_id, ioc_id=ioc.id))

        db.commit()
    except IntegrityError:
        db.rollback()
        db.commit()
