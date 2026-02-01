import time
import re
import requests

SCRIEM_BASE = "http://127.0.0.1:9000"

AUTH_FAIL_RE = re.compile(r"Failed password for (?P<user>\w+) from (?P<ip>[\d\.]+)")
AUTH_OK_RE   = re.compile(r"Accepted password for (?P<user>\w+) from (?P<ip>[\d\.]+)")
MALWARE_RE   = re.compile(r"ran malware payload (?P<file>\S+) user=(?P<user>\w+)")

def post_event(event: dict):
    r = requests.post(f"{SCRIEM_BASE}/events", json=event, timeout=5)
    r.raise_for_status()
    return r.json()

def parse_line(line: str, host: str):
    line = line.strip()
    if not line:
        return None

    m = AUTH_FAIL_RE.search(line)
    if m:
        return {
            "event_type": "login",
            "host": host,
            "user": m.group("user"),
            "action": "failed password",
            "details": {"ip": m.group("ip")}
        }

    m = AUTH_OK_RE.search(line)
    if m:
        return {
            "event_type": "login",
            "host": host,
            "user": m.group("user"),
            "action": "login success",
            "details": {"ip": m.group("ip")}
        }

    m = MALWARE_RE.search(line)
    if m:
        return {
            "event_type": "process",
            "host": host,
            "user": m.group("user"),
            "action": "ran malware payload",
            "details": {"file": m.group("file")}
        }

    return {
        "event_type": "unknown",
        "host": host,
        "user": "unknown",
        "action": "raw_log",
        "details": {"line": line}
    }

def tail_file(path: str, host: str):
    print(f"[FileCollector] Tailing {path} as host={host}")
    with open(path, "r", encoding="utf-8") as f:
        # start at beginning for demo (later we'll do tail -f)
        for line in f:
            event = parse_line(line, host)
            if event:
                try:
                    resp = post_event(event)
                    print("[OK]", resp)
                except Exception as e:
                    print("[ERR]", e)
            time.sleep(0.2)

if __name__ == "__main__":
    tail_file("../logs/sample_auth.log", host="server-4")
