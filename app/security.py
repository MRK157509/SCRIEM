# app/security.py

from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from app.config import API_KEY, JWT_SECRET, JWT_ALGORITHM

bearer = HTTPBearer(auto_error=False)


# ---------------- API Key Guard (for agents + ingestion) ----------------
def require_api_key(x_api_key: str = Header(default="")):
    """
    Production: protect ingestion endpoints (agent -> backend).
    Client must send header: x-api-key: <API_KEY>
    """
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


# ---------------- JWT Guards (for UI users) ----------------
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
