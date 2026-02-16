from datetime import datetime, timezone
from app.models_legacy import DetectionRule, Alert


def evaluate_event(db, event):
    rules = db.query(DetectionRule).all()
    created_ids = []

    for rule in rules:

        if rule.event_type and rule.event_type != event.event_type:
            continue

        if rule.action and rule.action != event.action:
            continue

        if rule.match_contains:
            if not event.details:
                continue
            if rule.match_contains.lower() not in event.details.lower():
                continue

        existing = (
            db.query(Alert)
            .filter(Alert.event_id == event.id)
            .filter(Alert.rule_id == rule.id)
            .first()
        )
        if existing:
            continue

        alert = Alert(
            title=rule.name,
            severity=rule.default_severity,
            status="OPEN",
            description=rule.description,
            host=event.host,
            event_id=event.id,
            rule_id=rule.id,
            rule_name=rule.name,
            created_at=datetime.now(timezone.utc),
        )

        db.add(alert)
        db.flush()
        created_ids.append(alert.id)

    return created_ids


def evaluate_events(db, events):
    total = 0
    for event in events:
        total += len(evaluate_event(db, event))
    return total
