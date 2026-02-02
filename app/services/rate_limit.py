from time import time

_last_seen = {}

def allow_request(host: str, limit_per_minute=120):
    now = time()
    window_start = now - 60
    timestamps = _last_seen.get(host, [])
    timestamps = [t for t in timestamps if t > window_start]

    if len(timestamps) >= limit_per_minute:
        return False

    timestamps.append(now)
    _last_seen[host] = timestamps
    return True
