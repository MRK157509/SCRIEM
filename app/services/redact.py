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


def _mask_iocs_anywhere(obj):
    """
    Deep mask any IOC-like substrings in arbitrary structures.
    """
    if isinstance(obj, dict):
        return {k: _mask_iocs_anywhere(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_mask_iocs_anywhere(x) for x in obj]
    if isinstance(obj, str):
        return _mask_string(obj)
    return obj


def _mask_alert_iocs_struct(alert: dict) -> dict:
    """
    Specifically masks the new Phase 5.4 alert['iocs'] structure:
      iocs = { ips:[], domains:[], hashes:[] }
    """
    iocs = alert.get("iocs")
    if not isinstance(iocs, dict):
        return alert

    ips = iocs.get("ips") or []
    domains = iocs.get("domains") or []
    hashes = iocs.get("hashes") or []

    masked = {
        "ips": [_mask_ip(str(x)) for x in ips],
        "domains": [_mask_domain(str(x)) for x in domains],
        "hashes": [_mask_hash(str(x)) for x in hashes],
    }
    alert["iocs"] = masked
    return alert


def _format_user_rule_name(alert: dict) -> str:
    """
    Your RBAC table: USER sees a friendly alias like 'Threat Rule #12'
    Falls back to generic if no rule_id.
    """
    rid = alert.get("rule_id")
    if rid is None:
        return "Threat Rule"
    try:
        return f"Threat Rule #{int(rid)}"
    except Exception:
        return "Threat Rule"


def redact_alert(alert: dict, role: str) -> dict:
    role = (role or "").upper()

    # ✅ ADMIN sees everything
    if role == "ADMIN":
        return alert

    redacted = deepcopy(alert)

    # Remove agent/system ids if they ever appear (SOC + USER)
    redacted = _strip_sensitive_keys(redacted)

    # ✅ SOC_ANALYST: real rule name, full IOCs allowed (per your latest: proper security for USER only)
    if role == "SOC_ANALYST":
        # Hide raw JSON tab is UI responsibility, not backend payload
        # Keep: iocs full, ioc_hits full, context full
        return redacted

    # 🔵 USER — strict masking
    if role == "USER":
        # Rule name alias
        redacted["rule_name"] = _format_user_rule_name(redacted)

        # Mask description/title text for IOC substrings
        if isinstance(redacted.get("title"), str):
            redacted["title"] = _mask_string(redacted["title"])
        if isinstance(redacted.get("description"), str):
            redacted["description"] = _mask_string(redacted["description"])
        if isinstance(redacted.get("host"), str):
            # host is not an IOC usually, but if it includes IP-style hostnames, mask
            redacted["host"] = _mask_string(redacted["host"])

        # Phase 5.4: mask structured alert IOCs (ips/domains/hashes arrays)
        redacted = _mask_alert_iocs_struct(redacted)

        # Context: keep safe counts/timestamps, but remove related event payload (too much data for USER)
        ctx = redacted.get("context")
        if isinstance(ctx, dict):
            if "related_events" in ctx:
                ctx.pop("related_events", None)

        # If any other nested strings contain IOCs, mask them too
        redacted = _mask_iocs_anywhere(redacted)

        return redacted

    # Default fallback for unknown roles
    return redacted


def redact_event(event_dict: dict, role: str) -> dict:
    role = (role or "").upper()
    e = deepcopy(event_dict)

    # Hide system identifiers for everyone except ADMIN
    if role != "ADMIN":
        e = _strip_sensitive_keys(e)

    # USER: mask IOC-like values anywhere in the event payload
    if role == "USER":
        e = _mask_iocs_anywhere(e)

    return e
