from fastapi import Depends, Header, HTTPException
import jwt

from app.config import JWT_SECRET, JWT_ALGORITHM


def get_principal(authorization: str = Header(None)) -> dict:
    """
    Reads JWT from: Authorization: Bearer <token>
    Returns: {"sub": "...", "role": "USER"|"SOC_ANALYST"|"ADMIN"}
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    sub = payload.get("sub")
    role = payload.get("role")
    if not sub or not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return {"sub": sub, "role": role}


def require_principal(p: dict = Depends(get_principal)) -> dict:
    return p
