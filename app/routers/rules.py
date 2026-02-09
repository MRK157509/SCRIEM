from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DetectionRule

router = APIRouter(prefix="/rules", tags=["rules"])


@router.get("/")
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(DetectionRule).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "mitre_tactic": r.mitre_tactic,
            "mitre_technique": r.mitre_technique,
            "default_severity": r.default_severity,
            "engine": r.engine,
        }
        for r in rules
    ]
