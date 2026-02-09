import logging
from fastapi import FastAPI

from app.database import engine
from app.models import Base

from app.routers import alerts, timeline, events, auth, rules, iocs

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("scriem")

# Create DB tables (dev)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SCRIEM")

# Routers
app.include_router(auth.router)
app.include_router(alerts.router)
app.include_router(timeline.router)
app.include_router(events.router)
app.include_router(rules.router)
app.include_router(iocs.router)


@app.get("/")
def health():
    return {"status": "SIEM running"}
