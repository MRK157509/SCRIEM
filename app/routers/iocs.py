from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import IOC, EventIOC, AlertIOC
from app.services.authz import require_principal

router = APIRouter(prefix="/iocs", tags=["iocs"])


@router.get("/search")
def search_iocs(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    role = principal["role"]
    query = q.strip()

    rows = (
        db.query(IOC)
        .filter(or_(IOC.value.ilike(f"%{query}%"), IOC.kind.ilike(f"%{query}%")))
        .order_by(IOC.last_seen.desc())
        .limit(50)
        .all()
    )

    out = []
    for i in rows:
        ev_count = db.query(EventIOC).filter(EventIOC.ioc_id == i.id).count()
        al_count = db.query(AlertIOC).filter(AlertIOC.ioc_id == i.id).count()

        value = i.value

        # ✅ RBAC safety for USER (counts-only-ish)
        if role == "USER":
            if i.kind == "ip":
                parts = value.split(".")
                if len(parts) == 4:
                    value = f"{parts[0]}.{parts[1]}.x.x"
                else:
                    value = "IP_REDACTED"
            else:
                value = f"{i.kind.upper()}_REDACTED"

        out.append(
            {
                "id": i.id,
                "kind": i.kind,
                "value": value,
                "first_seen": i.first_seen.isoformat() if i.first_seen else None,
                "last_seen": i.last_seen.isoformat() if i.last_seen else None,
                "hits": {"events": ev_count, "alerts": al_count},
            }
        )

    return out
