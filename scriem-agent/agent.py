import json
import os
import random
import time
import platform
from datetime import datetime, timezone
from typing import Dict, Any, List

import requests


# -------------------------
# Event generation
# -------------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def rand_internal_ip():
    return f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def rand_port():
    return random.choice([22, 53, 80, 443, 445, 3389, 8080, 9000, 135, 139])


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


def build_event(category: str) -> Dict[str, Any]:
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


# -------------------------
# Config + Queue (disk-backed JSONL)
# -------------------------
def load_config() -> Dict[str, Any]:
    here = os.path.dirname(__file__)
    with open(os.path.join(here, "agent_config.json"), "r", encoding="utf-8-sig") as f:
        return json.load(f)


def _queue_path(cfg: Dict[str, Any]) -> str:
    here = os.path.dirname(__file__)
    qname = cfg.get("queue_file", "queue.jsonl")
    return os.path.join(here, qname)


def append_to_queue(qpath: str, events: List[Dict[str, Any]]) -> None:
    with open(qpath, "a", encoding="utf-8") as f:
        for e in events:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")


def read_queue_batch(qpath: str, max_items: int) -> List[Dict[str, Any]]:
    if not os.path.exists(qpath):
        return []
    batch: List[Dict[str, Any]] = []
    with open(qpath, "r", encoding="utf-8") as f:
        for line in f:
            if len(batch) >= max_items:
                break
            line = line.strip()
            if not line:
                continue
            try:
                batch.append(json.loads(line))
            except Exception:
                # skip corrupt line
                continue
    return batch


def drop_queue_items(qpath: str, n: int) -> None:
    if n <= 0 or not os.path.exists(qpath):
        return

    with open(qpath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    remaining = lines[n:]
    if remaining:
        with open(qpath, "w", encoding="utf-8") as f:
            f.writelines(remaining)
    else:
        try:
            os.remove(qpath)
        except Exception:
            pass


def queue_size_events(qpath: str) -> int:
    if not os.path.exists(qpath):
        return 0
    with open(qpath, "r", encoding="utf-8") as f:
        return sum(1 for _ in f)


def enforce_queue_limit(qpath: str, max_events: int) -> None:
    if max_events <= 0:
        return
    n = queue_size_events(qpath)
    if n <= max_events:
        return
    drop = n - max_events
    drop_queue_items(qpath, drop)
    print(f"[SCRIEM-AGENT] queue limit exceeded; dropped_oldest={drop} remaining={max_events}")


# -------------------------
# HTTP send
# -------------------------
def post_batch(base: str, token: str, events: List[Dict[str, Any]], timeout_s: int):
    url = f"{base}/events/batch"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"events": events}
    return requests.post(url, json=payload, headers=headers, timeout=timeout_s)


def main():
    cfg = load_config()

    base = cfg["server_base"].rstrip("/")
    agent_token = (cfg.get("agent_token") or "").strip()
    if not agent_token:
        raise SystemExit("Missing agent_token in agent_config.json")

    batch_size = int(cfg.get("batch_size", 25))
    interval = float(cfg.get("interval_seconds", 2))
    jitter = float(cfg.get("jitter_seconds", 1))

    # drain-first: how many batches to flush per cycle
    max_flush_batches = int(cfg.get("max_flush_batches_per_cycle", 5))

    qpath = _queue_path(cfg)
    max_queue_events = int(cfg.get("max_queue_events", 20000))

    timeout_s = int(cfg.get("http_timeout_seconds", 15))
    backoff_initial = float(cfg.get("backoff_initial_seconds", 2))
    backoff_max = float(cfg.get("backoff_max_seconds", 60))
    backoff = backoff_initial

    enabled = []
    if cfg.get("enable_auth", True): enabled.append("auth")
    if cfg.get("enable_process", True): enabled.append("process")
    if cfg.get("enable_network", True): enabled.append("network")
    if cfg.get("enable_system", True): enabled.append("system")

    if not enabled:
        raise SystemExit("No categories enabled in agent_config.json")

    print(f"[SCRIEM-AGENT] node={platform.node()} -> {base}/events/batch")
    print(f"[SCRIEM-AGENT] categories={enabled}, batch_size={batch_size}, interval={interval}s (+ jitter {jitter}s)")
    print(f"[SCRIEM-AGENT] queue_file={os.path.basename(qpath)} max_queue_events={max_queue_events} max_flush_batches={max_flush_batches}")
    print("[SCRIEM-AGENT] Press CTRL+C to stop.")

    disabled_mode = False

    while True:
        # 1) Generate and enqueue (never lose)
        new_events = [build_event(random.choice(enabled)) for _ in range(batch_size)]
        append_to_queue(qpath, new_events)
        enforce_queue_limit(qpath, max_queue_events)

        # 2) If agent is disabled, pause and probe slowly
        if disabled_mode:
            time.sleep(min(15.0, interval + random.random() * jitter))
            try:
                probe = read_queue_batch(qpath, max_items=batch_size)
                if not probe:
                    continue

                r = post_batch(base, agent_token, probe, timeout_s)
                if r.status_code == 200:
                    data = r.json()
                    drop_queue_items(qpath, len(probe))
                    disabled_mode = False
                    backoff = backoff_initial
                    print(f"[SCRIEM-AGENT] re-enabled ✅ sent={data.get('count')} alerts_created={data.get('alerts_created')} queue_remaining={queue_size_events(qpath)}")
                elif r.status_code == 403 and "Agent disabled" in (r.text or ""):
                    print("[SCRIEM-AGENT] still disabled (server says 403). waiting...")
                else:
                    print("[SCRIEM-AGENT] disabled-mode probe failed:", r.status_code, (r.text or "")[:120])
            except Exception as e:
                print("[SCRIEM-AGENT] disabled-mode probe exception:", repr(e))
            continue

        # 3) Drain-first flushing: flush up to N batches per cycle
        flushed = 0
        while flushed < max_flush_batches:
            batch = read_queue_batch(qpath, max_items=batch_size)
            if not batch:
                break

            try:
                r = post_batch(base, agent_token, batch, timeout_s)

                if r.status_code == 200:
                    data = r.json()
                    drop_queue_items(qpath, len(batch))
                    backoff = backoff_initial
                    flushed += 1
                    print(f"[SCRIEM-AGENT] sent={data.get('count')} stored, alerts_created={data.get('alerts_created')} queue_remaining={queue_size_events(qpath)}")

                elif r.status_code == 403 and "Agent disabled" in (r.text or ""):
                    disabled_mode = True
                    print("[SCRIEM-AGENT] server disabled this agent (403). entering paused mode.")
                    break

                elif r.status_code == 401:
                    print("[SCRIEM-AGENT] AUTH FAILED (401). check agent_token or rotate token in UI/admin.")
                    time.sleep(min(backoff_max, max(5.0, backoff)))
                    backoff = min(backoff_max, max(backoff, 5.0) * 1.5)
                    break

                elif 500 <= r.status_code < 600:
                    print("[SCRIEM-AGENT] server error:", r.status_code, (r.text or "")[:120], f"backoff={backoff:.1f}s")
                    time.sleep(backoff)
                    backoff = min(backoff_max, backoff * 1.8)
                    break

                else:
                    print("[SCRIEM-AGENT] send failed:", r.status_code, (r.text or "")[:120], f"backoff={backoff:.1f}s")
                    time.sleep(min(backoff_max, max(2.0, backoff)))
                    backoff = min(backoff_max, backoff * 1.3)
                    break

            except Exception as e:
                print("[SCRIEM-AGENT] exception:", repr(e), f"backoff={backoff:.1f}s")
                time.sleep(backoff)
                backoff = min(backoff_max, backoff * 1.8)
                break

        # 4) Normal pacing
        time.sleep(interval + random.random() * jitter)


if __name__ == "__main__":
    main()
