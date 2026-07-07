from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case_record import CaseRecord, make_case_id
from app.services.authz import require_principal

router = APIRouter(prefix="/cases", tags=["cases"])

ALLOWED_STATUSES = {"OPEN", "TRIAGED", "ESCALATED", "CLOSED"}
ALLOWED_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _stable_item_key(item: Dict[str, Any]) -> str:
    return str(
        item.get("__scriemKey")
        or item.get("id")
        or item.get("_id")
        or item.get("alert_id")
        or item.get("event_id")
        or f"{item.get('title') or item.get('event_type') or 'untitled'}|{item.get('host') or 'nohost'}|{item.get('user') or 'nouser'}|{item.get('created_at') or item.get('timestamp') or ''}"
    )


def _normalize_items(items: Any) -> List[Dict[str, Any]]:
    if not isinstance(items, list):
        return []

    normalized: List[Dict[str, Any]] = []
    seen: set[str] = set()

    for raw in items:
        if not isinstance(raw, dict):
            continue
        item = dict(raw)
        item["kind"] = item.get("kind") or ("alert" if item.get("title") else "event")
        key = _stable_item_key(item)
        if key in seen:
            continue
        item["__scriemKey"] = key
        seen.add(key)
        normalized.append(item)

    return normalized


def _timeline_entry(entry_type: str, message: str) -> Dict[str, Any]:
    return {
        "at": _utcnow().isoformat(),
        "type": entry_type,
        "message": message,
    }


def _case_to_dict(case: CaseRecord) -> Dict[str, Any]:
    return {
        "id": case.id,
        "title": case.title,
        "description": case.description or "",
        "severity": case.severity or "MEDIUM",
        "status": case.status or "OPEN",
        "notes": case.notes or "",
        "items": case.items or [],
        "timeline": case.timeline or [],
        "created_by": case.created_by or "",
        "updated_by": case.updated_by or "",
        "created_at": _iso(case.created_at),
        "updated_at": _iso(case.updated_at),
    }


class CaseCreateIn(BaseModel):
    id: Optional[str] = None
    title: str = Field(min_length=1)
    description: str = ""
    severity: str = "MEDIUM"
    status: str = "OPEN"
    notes: str = ""
    items: List[Dict[str, Any]] = Field(default_factory=list)
    timeline: List[Dict[str, Any]] = Field(default_factory=list)


class CaseUpdateIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CaseItemsIn(BaseModel):
    items: List[Dict[str, Any]] = Field(default_factory=list)


@router.get("/")
def list_cases(
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    rows = db.query(CaseRecord).order_by(CaseRecord.updated_at.desc(), CaseRecord.id.desc()).all()
    return {"cases": [_case_to_dict(c) for c in rows], "count": len(rows), "user": principal["sub"]}


@router.get("/{case_id}")
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    row = db.query(CaseRecord).filter(CaseRecord.id == case_id).one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    payload = _case_to_dict(row)
    payload["viewer"] = principal["sub"]
    return payload


@router.post("/")
def create_case(
    body: CaseCreateIn,
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    now = _utcnow()
    case_id = body.id.strip() if body.id else make_case_id()
    severity = body.severity.upper().strip() if body.severity else "MEDIUM"
    status = body.status.upper().strip() if body.status else "OPEN"

    if severity not in ALLOWED_SEVERITIES:
        raise HTTPException(status_code=400, detail="Invalid severity")
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    case = CaseRecord(
        id=case_id,
        title=body.title.strip(),
        description=body.description or "",
        severity=severity,
        status=status,
        notes=body.notes or "",
        items=_normalize_items(body.items),
        timeline=body.timeline if body.timeline else [_timeline_entry("CASE_CREATED", "Case created")],
        created_by=principal["sub"],
        updated_by=principal["sub"],
        created_at=now,
        updated_at=now,
    )

    db.add(case)
    db.commit()
    db.refresh(case)
    return _case_to_dict(case)


@router.patch("/{case_id}")
def update_case(
    case_id: str,
    body: CaseUpdateIn,
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    case = db.query(CaseRecord).filter(CaseRecord.id == case_id).one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    changed = []

    if body.title is not None:
        case.title = body.title.strip() or case.title
        changed.append("title")
    if body.description is not None:
        case.description = body.description
        changed.append("description")
    if body.severity is not None:
        sev = body.severity.upper().strip()
        if sev not in ALLOWED_SEVERITIES:
            raise HTTPException(status_code=400, detail="Invalid severity")
        case.severity = sev
        changed.append("severity")
    if body.status is not None:
        st = body.status.upper().strip()
        if st not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        case.status = st
        changed.append("status")
    if body.notes is not None:
        case.notes = body.notes
        changed.append("notes")

    if changed:
        timeline = list(case.timeline or [])
        timeline.insert(0, _timeline_entry("CASE_UPDATED", f"Updated {', '.join(changed)}"))
        case.timeline = timeline[:100]
        case.updated_by = principal["sub"]
        case.updated_at = _utcnow()

    db.add(case)
    db.commit()
    db.refresh(case)
    return _case_to_dict(case)


@router.patch("/{case_id}/notes")
def update_case_notes(
    case_id: str,
    body: CaseUpdateIn,
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    if body.notes is None:
        raise HTTPException(status_code=400, detail="Missing notes")
    return update_case(case_id, CaseUpdateIn(notes=body.notes), db=db, principal=principal)


@router.post("/{case_id}/items")
def add_case_items(
    case_id: str,
    body: CaseItemsIn,
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    case = db.query(CaseRecord).filter(CaseRecord.id == case_id).one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    existing = {_stable_item_key(item) for item in (case.items or []) if isinstance(item, dict)}
    incoming = _normalize_items(body.items)
    to_add = [item for item in incoming if _stable_item_key(item) not in existing]

    if to_add:
        case.items = to_add + list(case.items or [])
        timeline = list(case.timeline or [])
        timeline.insert(0, _timeline_entry("ITEMS_ADDED", f"Added {len(to_add)} item(s)"))
        case.timeline = timeline[:100]
        case.updated_by = principal["sub"]
        case.updated_at = _utcnow()

    db.add(case)
    db.commit()
    db.refresh(case)
    return _case_to_dict(case)
