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
