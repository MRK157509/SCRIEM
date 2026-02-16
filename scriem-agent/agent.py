import json
import os
import random
import time
import platform
from datetime import datetime, timezone

import requests


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def rand_internal_ip():
    return f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def rand_port():
    return random.choice([22, 53, 80, 443, 445, 3389, 8080, 9000, 135, 139])


def rand_hash():
    alphabet = "abcdef0123456789"
    return "".join(random.choice(alphabet) for _ in range(64))


HOSTS = [
    "WIN-DC01", "WIN-WS01", "WIN-WS02",
    "LINUX-WEB01", "LINUX-BASTION",
    "DB-SERVER01", "HR-LAPTOP01", "FINANCE-PC02"
]

USERS = ["administrator", "svc_backup", "svc_web", "alice", "bob", "charlie", "guest", "dbadmin"]

SUSPICIOUS_DOMAINS = [
    "malicious-update.ru", "c2-control.net", "stealer-download.cc", "cdn-login-security[.]com"
]

PROCESS_TEMPLATES = [
    ("process", "powershell", "powershell.exe -enc JABXAGkAbgA{n}"),
    ("process", "cmd", "cmd.exe /c whoami && ipconfig"),
    ("process", "rundll32", "rundll32.exe shell32.dll,Control_RunDLL"),
    ("process", "wscript", "wscript.exe //B //NoLogo script.vbs"),
]

AUTH_TEMPLATES = [
    ("auth", "login_failed", "Failed login for {user} from {ip}"),
    ("auth", "login_success", "Successful login for {user} from {ip}"),
    ("auth", "mfa_failed", "MFA failure for {user} from {ip}"),
]

NETWORK_TEMPLATES = [
    ("network", "dns_query", "DNS query to {domain}"),
    ("network", "port_scan", "Port scan from {ip} against ports {ports}"),
    ("network", "exfil", "Large outbound transfer {mb}MB to {ip}"),
]

SYSTEM_TEMPLATES = [
    ("system", "new_user", "New local admin user created: {user}"),
    ("system", "service_install", "New service installed: {svc}"),
    ("system", "heartbeat", "SCRIEM agent heartbeat"),
]


def build_event(category):
    host = random.choice(HOSTS)
    user = random.choice(USERS)
    ip = rand_internal_ip()

    if category == "auth":
        et, act, tmpl = random.choice(AUTH_TEMPLATES)
        details = tmpl.format(user=user, ip=ip)

    elif category == "process":
        et, act, tmpl = random.choice(PROCESS_TEMPLATES)
        details = tmpl.format(n=random.randint(1000, 9999))

    elif category == "network":
        et, act, tmpl = random.choice(NETWORK_TEMPLATES)
        details = tmpl.format(
            domain=random.choice(SUSPICIOUS_DOMAINS),
            ip=rand_internal_ip(),
            ports=",".join(str(rand_port()) for _ in range(random.randint(3, 9))),
            mb=random.randint(50, 2500),
        )

    else:  # system
        et, act, tmpl = random.choice(SYSTEM_TEMPLATES)
        details = tmpl.format(
            user=random.choice(["backup_admin", "ops_admin", "helpdesk_admin"]),
            svc=random.choice(["updaterSvc", "winmgmt-helper", "telemetryd"]),
        )

    return {
        "host": host,
        "user": user,
        "event_type": et,
        "action": act,
        "details": details,
        "timestamp": now_iso(),
    }


def load_config():
    here = os.path.dirname(__file__)
    with open(os.path.join(here, "agent_config.json"), "r", encoding="utf-8-sig") as f:
        return json.load(f)


def main():
    cfg = load_config()
    base = cfg["server_base"].rstrip("/")
    api_key = cfg["api_key"]
    batch_size = int(cfg.get("batch_size", 25))
    interval = float(cfg.get("interval_seconds", 2))
    jitter = float(cfg.get("jitter_seconds", 1))

    headers = {"x-api-key": api_key}

    enabled = []
    if cfg.get("enable_auth", True): enabled.append("auth")
    if cfg.get("enable_process", True): enabled.append("process")
    if cfg.get("enable_network", True): enabled.append("network")
    if cfg.get("enable_system", True): enabled.append("system")

    if not enabled:
        raise SystemExit("No categories enabled in agent_config.json")

    print(f"[SCRIEM-AGENT] host={platform.node()} -> {base}/events/batch")
    print(f"[SCRIEM-AGENT] categories={enabled}, batch_size={batch_size}, interval={interval}s (+ jitter {jitter}s)")
    print("[SCRIEM-AGENT] Press CTRL+C to stop.")

    while True:
        events = [build_event(random.choice(enabled)) for _ in range(batch_size)]
        payload = {"events": events}

        try:
            r = requests.post(f"{base}/events/batch", json=payload, headers=headers, timeout=15)
            if r.status_code != 200:
                print("[SCRIEM-AGENT] send failed:", r.status_code, r.text[:200])
            else:
                data = r.json()
                print(f"[SCRIEM-AGENT] sent={data.get('count')} stored, alerts_created={data.get('alerts_created')}")
        except Exception as e:
            print("[SCRIEM-AGENT] exception:", repr(e))

        sleep_for = interval + random.random() * jitter
        time.sleep(sleep_for)


if __name__ == "__main__":
    main()
