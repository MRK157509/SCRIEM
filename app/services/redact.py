import re
from copy import deepcopy

IP_RE = re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b")
DOMAIN_RE = re.compile(r"\b(?!(?:https?:\/\/))(?:(?:[a-z0-9-]{1,63}\.)+(?:[a-z]{2,24}))\b", re.I)
HASH_RE = re.compile(r"\b[a-f0-9]{32}\b|\b[a-f0-9]{40}\b|\b[a-f0-9]{64}\b", re.I)

# keys we treat as "agent/system ids" (hidden for USER + SOC_ANALYST)
SENSITIVE_KEY_RE = re.compile(r"(agent|sensor|collector|system|device|machine|endpoint|host_id|agent_id|system_id)", re.I)


def _mask_ip(ip: str) -> str:
    parts = ip.split(".")
    if len(parts) != 4:
        return "x.x.x.x"
    return f"{parts[0]}.{parts[1]}.x.x"


def _mask_domain(d: str) -> str:
    if len(d) <= 6:
        return "******"
    return f"{d[:3]}***{d[-3:]}"


def _mask_hash(h: str) -> str:
    if len(h) <= 10:
        return "********"
    return f"{h[:4]}…{h[-4:]}"


def _mask_string(s: str) -> str:
    s2 = IP_RE.sub(lambda m: _mask_ip(m.group(0)), s)
    s2 = HASH_RE.sub(lambda m: _mask_hash(m.group(0)), s2)
    s2 = DOMAIN_RE.sub(lambda m: _mask_domain(m.group(0)), s2)
    return s2


def _strip_sensitive_keys(obj):
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if SENSITIVE_KEY_RE.search(str(k)):
                continue
            out[k] = _strip_sensitive_keys(v)
        return out
    if isinstance(obj, list):
        return [_strip_sensitive_keys(x) for x in obj]
    return obj


def _mask_iocs(obj):
    if isinstance(obj, dict):
        return {k: _mask_iocs(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_mask_iocs(x) for x in obj]
    if isinstance(obj, str):
        return _mask_string(obj)
    return obj


def redact_alert(alert: dict, role: str) -> dict:
    role = (role or "").upper()

    # ✅ ADMIN sees everything — no masking
    if role == "ADMIN":
        return alert

    redacted = alert.copy()

    # 🟡 SOC_ANALYST — can see rule name, but not system IDs if you add later
    if role == "SOC_ANALYST":
        # Analysts can see real detection rule names
        return redacted

    # 🔵 USER — heavy masking
    if role == "USER":
        # Mask detection rule name
        if redacted.get("rule_name"):
            redacted["rule_name"] = "Threat Rule"

        # Mask host IP patterns inside description (basic masking)
        if redacted.get("description"):
            redacted["description"] = redacted["description"].replace("10.", "10.x.")

        return redacted

    # Default fallback
    return redacted



def redact_event(event_dict: dict, role: str) -> dict:
    role = (role or "").upper()
    e = deepcopy(event_dict)

    if role != "ADMIN":
        e = _strip_sensitive_keys(e)

    if role == "USER":
        e = _mask_iocs(e)

    return e
