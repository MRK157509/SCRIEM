from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models

from app.services.authz import require_principal

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary")
def metrics_summary(
    db: Session = Depends(get_db),
    principal: dict = Depends(require_principal),
):
    # RBAC: any logged-in role can view summary
    # role = principal["role"]

    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)

    # Totals
    alerts_total = db.query(models.Alert).count()
    events_total = db.query(models.Event).count()
    iocs_total = db.query(models.IOC).count() if hasattr(models, "IOC") else 0

    # Alerts in last 24h
    alerts_last_24h = (
        db.query(models.Alert)
        .filter(models.Alert.created_at >= since_24h)
        .count()
    )

    # Alerts by status
    by_status_rows = (
        db.query(models.Alert.status, func.count(models.Alert.id))
        .group_by(models.Alert.status)
        .all()
    )
    alerts_by_status = {s or "UNKNOWN": int(c) for s, c in by_status_rows}

    # Alerts by severity
    by_sev_rows = (
        db.query(models.Alert.severity, func.count(models.Alert.id))
        .group_by(models.Alert.severity)
        .all()
    )
    alerts_by_severity = {s or "UNKNOWN": int(c) for s, c in by_sev_rows}

    # IOCs by kind
    iocs_by_kind = {}
    if hasattr(models, "IOC"):
        by_kind_rows = (
            db.query(models.IOC.kind, func.count(models.IOC.id))
            .group_by(models.IOC.kind)
            .all()
        )
        iocs_by_kind = {k or "UNKNOWN": int(c) for k, c in by_kind_rows}

    # Top hosts by alert volume (top 10)
    top_hosts_rows = (
        db.query(models.Alert.host, func.count(models.Alert.id).label("cnt"))
        .group_by(models.Alert.host)
        .order_by(func.count(models.Alert.id).desc())
        .limit(10)
        .all()
    )
    top_hosts = [{"host": h or "UNKNOWN", "alerts": int(c)} for h, c in top_hosts_rows]

    # Top rules (rule_id if present; fallback to rule_name)
    # Prefer rule_id for stable identity
    top_rules = []
    if hasattr(models.Alert, "rule_id"):
        top_rules_rows = (
            db.query(models.Alert.rule_id, func.count(models.Alert.id).label("cnt"))
            .group_by(models.Alert.rule_id)
            .order_by(func.count(models.Alert.id).desc())
            .limit(10)
            .all()
        )
        top_rules = [{"rule_id": rid, "alerts": int(c)} for rid, c in top_rules_rows]
    else:
        top_rules_rows = (
            db.query(models.Alert.rule_name, func.count(models.Alert.id).label("cnt"))
            .group_by(models.Alert.rule_name)
            .order_by(func.count(models.Alert.id).desc())
            .limit(10)
            .all()
        )
        top_rules = [{"rule_name": rn or "UNKNOWN", "alerts": int(c)} for rn, c in top_rules_rows]

    return {
        "generated_at": now.isoformat(),
        "window": {"last_24h_since": since_24h.isoformat()},
        "counts": {
            "alerts_total": alerts_total,
            "events_total": events_total,
            "iocs_total": iocs_total,
        },
        "last_24h": {
            "alerts_created": alerts_last_24h,
        },
        "alerts": {
            "by_status": alerts_by_status,
            "by_severity": alerts_by_severity,
        },
        "iocs": {
            "by_kind": iocs_by_kind,
        },
        "top": {
            "hosts": top_hosts,
            "rules": top_rules,
        },
    }
