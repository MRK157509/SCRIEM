import random
import requests
from datetime import datetime, timezone

BASE = "http://127.0.0.1:9000"
HEADERS = {"x-api-key": "scriem-secret-key"}  # required by your backend


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

        # Use common field names across your project
        # Include extra optional fields (most pydantic models ignore unknowns)
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


def post_batch(events):
    url = f"{BASE}/events/batch"

    # Try 1: wrapper { "events": [...] }
    r = requests.post(url, json={"events": events}, headers=HEADERS, timeout=30)
    if r.status_code != 422:
        return r

    # Try 2: raw list [...]
    r2 = requests.post(url, json=events, headers=HEADERS, timeout=30)
    if r2.status_code != 422:
        return r2

    # Still 422 => print details and fall back to single ingest
    return r2


def post_single(events):
    url = f"{BASE}/events"
    ok = 0
    for e in events:
        r = requests.post(url, json=e, headers=HEADERS, timeout=10)
        if r.status_code in (200, 201):
            ok += 1
        else:
            # show first failure and stop
            print("Single ingest failed:")
            print("status=", r.status_code)
            print(r.text[:800])
            return False
    print(f"Single ingest succeeded: {ok}/{len(events)}")
    return True


if __name__ == "__main__":
    events = build_events(200)

    r = post_batch(events)
    print("batch status=", r.status_code)
    print(r.text[:800])

    if r.status_code == 422:
        print("\nBatch shape mismatch (422). Falling back to single /events ingest...\n")
        post_single(events)
