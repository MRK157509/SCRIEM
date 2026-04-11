import json
import os
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
    token = os.getenv("SCRIEM_AGENT_TOKEN", "").strip()
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    for attempt in range(1, retries + 1):
        try:
            r = requests.post(url, json=event, headers=headers, timeout=5)
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
    batch_size = int(cfg.get("batch_size", 5))
    flush_seconds = int(cfg.get("flush_seconds", 10))
    queue = []
    last_flush = time.time()

    print(f"[SCRIEM Agent] Sending events to {base_url} as host={host} every {interval}s")
    while True:
        event = generate_event(host, user)
        queue.append(event)

        should_flush = len(queue) >= batch_size or (time.time() - last_flush) >= flush_seconds

        if should_flush:
            payload = queue[:]
            queue.clear()

            try:
                url = f"{base_url}/events/batch"
                token = os.getenv("SCRIEM_AGENT_TOKEN", "").strip()
                headers = {"Authorization": f"Bearer {token}"} if token else {}
                r = requests.post(url, json=payload, headers=headers, timeout=10)
                r.raise_for_status()
                print("[BATCH OK]", r.json())
            except Exception as e:
                print("[BATCH ERR]", e)
                # put events back so we don't lose them
                queue = payload + queue

            last_flush = time.time()

        time.sleep(interval)

if __name__ == "__main__":
    main()
