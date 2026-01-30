from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Alert

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/")
def get_alerts(db: Session = Depends(get_db)):
    return db.query(Alert).all()
