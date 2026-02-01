import json
import time
import random
import requests
from datetime import datetime

def load_config(path="config.example.json"):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def send_event(base_url: str, event: dict, retries=5):
    url = f"{base_url}/events"
    delay = 1  # initial backoff delay (seconds)

    for attempt in range(1, retries + 1):
        try:
            r = requests.post(url, json=event, timeout=5)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print(f"[WARN] Attempt {attempt} failed: {e}")
            if attempt == retries:
                print("[DROP] Event dropped after max retries")
                return None
            time.sleep(delay)
            delay *= 2  # exponential backoff

def generate_event(host: str, user: str) -> dict:
    # Simulate realistic endpoint telemetry
    templates = [
        {"event_type": "login", "action": "failed password", "details": {"ip": "10.0.0.5"}},
        {"event_type": "login", "action": "login success", "details": {"ip": "10.0.0.5"}},
        {"event_type": "process", "action": "started process", "details": {"process": "chrome.exe"}},
        {"event_type": "process", "action": "ran malware payload", "details": {"file": "evil.exe"}},
    ]
    t = random.choice(templates)
    return {
        "event_type": t["event_type"],
        "host": host,
        "user": user,
        "action": t["action"],
        "details": t["details"],
        "agent_time": datetime.utcnow().isoformat() + "Z"
    }

def main():
    cfg = load_config()
    base_url = cfg["scriem_base_url"]
    host = cfg["host"]
    user = cfg["user"]
    interval = int(cfg.get("interval_seconds", 3))

    print(f"[SCRIEM Agent] Sending events to {base_url} as host={host} every {interval}s")
    while True:
        event = generate_event(host, user)
        try:
            resp = send_event(base_url, event)
            print("[OK]", resp)
        except Exception as e:
            print("[ERR]", e)
        time.sleep(interval)

if __name__ == "__main__":
    main()
