from fastapi import FastAPI
from .database import engine
from .models import Base
from app.routers import events
from app.routers import alerts, timeline
from app.routers import alerts

import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("scriem")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SCRIEM")

app.include_router(alerts.router)
app.include_router(timeline.router)

app.include_router(events.router)

app.include_router(alerts.router)


@app.get("/")
def health():
    return {"status": "SIEM running"}
