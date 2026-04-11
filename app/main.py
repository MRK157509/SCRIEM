# app/main.py
import logging
from fastapi import FastAPI

from app.database import engine, Base

# IMPORTANT:
# We import models BEFORE create_all so SQLAlchemy registers tables.
# But we do it in a controlled block to reduce circular-import problems.
try:
    import app.models_legacy  # loads your existing models (Alert, Event, IOC, etc.)
except Exception as e:
    raise RuntimeError(f"Failed to import legacy models (app.models_legacy): {e}")

try:
    # loads new modular models (Phase 6 tables + Phase 7 agents)
    import app.models.alert_ai_analysis  # noqa: F401
    import app.models.agent  # noqa: F401
except Exception as e:
    raise RuntimeError(f"Failed to import modular models (app.models.*): {e}")


# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("scriem")

# Create DB tables (dev)
Base.metadata.create_all(bind=engine)


def _seed_default_rules_and_backfill():
    from app.database import SessionLocal
    from app.models_legacy import DetectionRule, Event, Alert
    from app.services.detection import evaluate_events

    defaults = [
        {
            "name": "Failed Login Attempts",
            "description": "Login failures should generate an alert.",
            "match_contains": "failed",
            "event_type": "auth",
            "action": "login_failed",
            "default_severity": "HIGH",
            "mitre_tactic": "Credential Access",
            "mitre_technique": "T1110",
        },
        {
            "name": "Suspicious PowerShell",
            "description": "Encoded PowerShell activity is high risk.",
            "match_contains": "powershell",
            "event_type": "process",
            "action": "powershell",
            "default_severity": "HIGH",
            "mitre_tactic": "Execution",
            "mitre_technique": "T1059.001",
        },
        {
            "name": "Suspicious DNS Query",
            "description": "DNS activity to suspicious domains.",
            "match_contains": "dns",
            "event_type": "dns",
            "action": "query",
            "default_severity": "MEDIUM",
            "mitre_tactic": "Command and Control",
            "mitre_technique": "T1071.004",
        },
        {
            "name": "Privilege Escalation / New User",
            "description": "New privileged users should be reviewed.",
            "match_contains": "new admin user",
            "event_type": "system",
            "action": "new_user",
            "default_severity": "CRITICAL",
            "mitre_tactic": "Persistence",
            "mitre_technique": "T1136",
        },
        {
            "name": "Data Exfiltration",
            "description": "Large outbound transfers should be investigated.",
            "match_contains": "outbound transfer",
            "event_type": "network",
            "action": "exfil",
            "default_severity": "CRITICAL",
            "mitre_tactic": "Exfiltration",
            "mitre_technique": "T1041",
        },
        {
            "name": "Known Malware Hash",
            "description": "Hash hits should generate an alert.",
            "match_contains": "malware hash",
            "event_type": "file",
            "action": "hash_hit",
            "default_severity": "HIGH",
            "mitre_tactic": "Execution",
            "mitre_technique": "T1204",
        },
    ]

    db = SessionLocal()
    try:
        if db.query(DetectionRule).count() == 0:
            for row in defaults:
                db.add(DetectionRule(**row))
            db.commit()
            logger.info("Seeded default detection rules")

        if db.query(Alert).count() == 0:
            events = db.query(Event).order_by(Event.id.asc()).all()
            if events:
                evaluate_events(db, events)
                db.commit()
                logger.info("Backfilled alerts from existing events")
    finally:
        db.close()


_seed_default_rules_and_backfill()

app = FastAPI(title="SCRIEM")

from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOW_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS or [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routers (import AFTER models are registered)
from app.routers import alerts, timeline, events, auth, rules, iocs, metrics, alerts_ai, agents  # noqa: E402

app.include_router(agents.router)
app.include_router(auth.router)
app.include_router(alerts_ai.router)
app.include_router(timeline.router)
app.include_router(events.router)
app.include_router(rules.router)
app.include_router(iocs.router)
app.include_router(metrics.router)
app.include_router(alerts.router)


@app.get("/")
def health():
    return {"status": "SIEM running"}
