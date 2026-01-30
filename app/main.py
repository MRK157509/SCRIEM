from fastapi import FastAPI
from .database import engine
from .models import Base
from app.routers import events

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SCRIEM")

app.include_router(events.router)


@app.get("/")
def health():
    return {"status": "SIEM running"}
