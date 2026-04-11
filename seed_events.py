import random
from datetime import datetime, timezone

import requests

from app.database import SessionLocal
from app.models.agent import Agent
from app.security import generate_agent_token, hash_token

BASE = "http://127.0.0.1:9000"
AGENT_NAME = "seed-agent"

hosts = ["lab-host", "win-laptop-01", "win-laptop-02", "server-2", "server-3", "srv-db-1"]
users = ["alice", "bob", "charlie", "admin", "svc-web", "dbadmin"]

patterns = [
    ("auth", "login_failed", "Failed login for {user} from {ip}"),
    ("auth", "login_success", "Successful login for {user} from {ip}"),
    ("auth", "mfa_failed", "MFA failure for {user} from {ip}"),
    ("process", "powershell", "powershell.exe -enc {blob}"),
    ("process", "cmd", "cmd.exe /c whoami && ipconfig"),
    ("dns", "query", "DNS query to suspicious-domain.bad"),
    ("network", "port_scan", "Multiple ports probed from {ip}"),
    ("file", "hash_hit", "Known malware hash detected: eicar-test"),
    ("system", "new_user", "New local admin user created: backup_admin"),
    ("system", "service_install", "New service installed: updaterSvc"),
    ("network", "exfil", "Large outbound transfer 1.2GB to 203.0.113.9"),
]


def rand_ip():
    return f"10.0.0.{random.randint(10,250)}"


def rand_blob():
    return "JABXAGkAbgA" + str(random.randint(1000, 9999))


def build_events(n=200):
    now = datetime.now(timezone.utc).isoformat()

    events = []
    for _ in range(n):
        host = random.choice(hosts)
        user = random.choice(users)
        et, act, msg_t = random.choice(patterns)
        ip = rand_ip()
        msg = msg_t.format(user=user, ip=ip, blob=rand_blob())

        events.append(
            {
                "host": host,
                "user": user,
                "event_type": et,
                "action": act,
                "details": msg,
                "ip": ip,
                "src_ip": ip,
                "timestamp": now,
            }
        )
    return events


def ensure_seed_agent_token():
    db = SessionLocal()
    try:
        token = generate_agent_token()
        now = datetime.now(timezone.utc)

        agent = db.query(Agent).filter(Agent.name == AGENT_NAME).one_or_none()
        if agent is None:
            agent = Agent(
                name=AGENT_NAME,
                description="Local seed ingest agent",
                host="seed-host",
                ip="127.0.0.1",
                version="seed",
                environment="dev",
                token_hash=hash_token(token),
                is_active=True,
                created_at=now,
                last_seen=now,
                token_last_rotated=now,
            )
            db.add(agent)
        else:
            agent.token_hash = hash_token(token)
            agent.is_active = True
            agent.last_seen = now
            agent.token_last_rotated = now
            db.add(agent)

        db.commit()
        return token
    finally:
        db.close()


def post_batch(events, token):
    url = f"{BASE}/events/batch"
    headers = {"Authorization": f"Bearer {token}"}
    return requests.post(url, json={"events": events}, headers=headers, timeout=30)


if __name__ == "__main__":
    events = build_events(200)
    token = ensure_seed_agent_token()

    r = post_batch(events, token)
    print("batch status=", r.status_code)
    print(r.text[:800])
    print("\nSeed agent token (store this if you want to reuse the simulator):")
    print(token)
