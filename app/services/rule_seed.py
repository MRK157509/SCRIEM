from sqlalchemy.orm import Session
from app.models import DetectionRule

DEFAULT_RULES = [
    {
        "name": "Multiple Failed Logins",
        "description": "Brute force login attempt detected",
        "mitre_tactic": "Credential Access",
        "mitre_technique": "T1110",
        "default_severity": "HIGH",
    },
    {
        "name": "Suspicious Process Execution",
        "description": "Potential malware execution",
        "mitre_tactic": "Execution",
        "mitre_technique": "T1059",
        "default_severity": "HIGH",
    },
    {
        "name": "Privilege Escalation Attempt",
        "description": "User attempted privilege escalation",
        "mitre_tactic": "Privilege Escalation",
        "mitre_technique": "T1068",
        "default_severity": "CRITICAL",
    },
]


def seed_detection_rules(db: Session):
    existing = {r.name for r in db.query(DetectionRule).all()}

    for rule in DEFAULT_RULES:
        if rule["name"] not in existing:
            db.add(DetectionRule(**rule))

    db.commit()
