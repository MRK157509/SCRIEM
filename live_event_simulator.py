# live_event_simulator.py

import random
import time
import requests
from datetime import datetime, timezone

BASE = "http://127.0.0.1:9000"
HEADERS = {"x-api-key": "scriem-secret-key"}

HOSTS = [
    "WIN-DC01",
    "WIN-WS01",
    "LINUX-WEB01",
    "DB-SERVER01",
    "HR-LAPTOP01",
    "FINANCE-PC02",
]

USERS = [
    "administrator",
    "svc_backup",
    "john.doe",
    "alice",
    "bob",
    "guest",
]

SUSPICIOUS_DOMAINS = [
    "malicious-update.ru",
    "c2-control.net",
    "stealer-download.cc",
]

def random_ip():
    return f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"

def random_external_ip():
    return f"{random.randint(20,200)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"

def generate_auth_event():
    success = random.choice([True, False])
    return {
        "host": random.choice(HOSTS),
        "user": random.choice(USERS),
        "event_type": "auth",
        "action": "login_success" if success else "login_failed",
        "details": f"User login {'successful' if success else 'failed'} from {random_ip()}",
    }

def generate_process_event():
    encoded = random.choice([True, False])
    cmd = (
        "powershell.exe -enc JABXAGkAbgA"
        if encoded
        else "cmd.exe /c whoami && ipconfig"
    )

    return {
        "host": random.choice(HOSTS),
        "user": random.choice(USERS),
        "event_type": "process",
        "action": "powershell" if encoded else "cmd",
        "details": cmd,
    }

def generate_network_event():
    domain = random.choice(SUSPICIOUS_DOMAINS)
    return {
        "host": random.choice(HOSTS),
        "user": random.choice(USERS),
        "event_type": "network",
        "action": "dns_query",
        "details": f"DNS query to {domain}",
    }

def generate_privilege_event():
    return {
        "host": random.choice(HOSTS),
        "user": random.choice(USERS),
        "event_type": "system",
        "action": "new_user",
        "details": "New admin user created: backup_admin",
    }

EVENT_GENERATORS = [
    generate_auth_event,
    generate_process_event,
    generate_network_event,
    generate_privilege_event,
]

def send_event(event):
    try:
        r = requests.post(f"{BASE}/events", json=event, headers=HEADERS, timeout=5)
        print(f"[{r.status_code}] {event['event_type']} | {event['action']}")
    except Exception as e:
        print("Error sending event:", e)

def run_simulator(interval=2):
    print("Live Event Simulator Started...")
    while True:
        event = random.choice(EVENT_GENERATORS)()
        send_event(event)
        time.sleep(interval)

if __name__ == "__main__":
    run_simulator()

