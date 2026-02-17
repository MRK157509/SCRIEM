# app/security.py

import hashlib
import hmac
import secrets
from datetime import datetime, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from app.config import JWT_SECRET, JWT_ALGORITHM

bearer = HTTPBearer(auto_error=False)


def _utcnow():
    return datetime.now(timezone.utc)


# --------------------------
# Agent Token Helpers
# --------------------------
def generate_agent_token() -> str:
    # urlsafe token suitable for headers/logs (don’t log it in practice)
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    # store only hashes in DB (never plaintext)
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


# --------------------------
# Agent Guard (for ingestion)
# --------------------------
def require_agent_token(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    """
    Protect ingestion endpoints (agent -> backend) using per-agent Bearer token.

    Agent must send:
      Authorization: Bearer <agent_token>

    We store sha256(token) in DB and compare in constant-time.
    """
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Missing agent token")

    token = creds.credentials
    token_h = hash_token(token)

    # Local import avoids circular imports at module import time
    from app.database import SessionLocal
    from app.models.agent import Agent

    db = SessionLocal()
    try:
        agent = db.query(Agent).filter(Agent.token_hash == token_h).first()
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid agent token")
        if not agent.is_active:
            raise HTTPException(status_code=403, detail="Agent disabled")

        # update last_seen (best-effort)
        agent.last_seen = _utcnow()
        db.add(agent)
        db.commit()

        return agent
    finally:
        db.close()


# --------------------------
# JWT Guards (for UI users)
# --------------------------
def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    return payload


def require_role(*roles):
    def _guard(user=Depends(get_current_user)):
        user_role = user.get("role")
        if user_role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return _guard
