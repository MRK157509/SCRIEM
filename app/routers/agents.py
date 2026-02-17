# app/routers/agents.py

from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.agent import Agent
from app.security import generate_agent_token, hash_token, require_role


router = APIRouter(prefix="/agents", tags=["agents"])


def _utcnow():
    return datetime.now(timezone.utc)


class AgentCreateIn(BaseModel):
    name: str
    description: Optional[str] = ""
    host: Optional[str] = ""
    ip: Optional[str] = ""
    version: Optional[str] = ""
    environment: Optional[str] = ""


class AgentOut(BaseModel):
    id: int
    name: str
    description: str
    host: str
    ip: str
    version: str
    environment: str
    is_active: bool
    created_at: datetime
    last_seen: Optional[datetime]

    class Config:
        from_attributes = True


class AgentCreateOut(AgentOut):
    # shown ONE TIME at creation (store it somewhere safe)
    token: str


class AgentUpdateIn(BaseModel):
    description: Optional[str] = None
    host: Optional[str] = None
    ip: Optional[str] = None
    version: Optional[str] = None
    environment: Optional[str] = None
    is_active: Optional[bool] = None


@router.post("", response_model=AgentCreateOut, dependencies=[Depends(require_role("ADMIN"))])
def create_agent(body: AgentCreateIn, db: Session = Depends(get_db)):
    existing = db.query(Agent).filter(Agent.name == body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Agent name already exists")

    token = generate_agent_token()

    agent = Agent(
        name=body.name.strip(),
        description=body.description or "",
        host=body.host or "",
        ip=body.ip or "",
        version=body.version or "",
        environment=body.environment or "",
        token_hash=hash_token(token),
        is_active=True,
        created_at=_utcnow(),
        token_last_rotated=_utcnow(),
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    return AgentCreateOut(**AgentOut.model_validate(agent).model_dump(), token=token)


@router.get("", response_model=List[AgentOut], dependencies=[Depends(require_role("ADMIN"))])
def list_agents(db: Session = Depends(get_db)):
    rows = db.query(Agent).order_by(Agent.id.desc()).all()
    return [AgentOut.model_validate(a) for a in rows]


@router.patch("/{agent_id}", response_model=AgentOut, dependencies=[Depends(require_role("ADMIN"))])
def update_agent(agent_id: int, body: AgentUpdateIn, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(agent, k, v)

    db.add(agent)
    db.commit()
    db.refresh(agent)
    return AgentOut.model_validate(agent)


@router.post("/{agent_id}/rotate-token", response_model=AgentCreateOut, dependencies=[Depends(require_role("ADMIN"))])
def rotate_agent_token(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    token = generate_agent_token()
    agent.token_hash = hash_token(token)
    agent.token_last_rotated = _utcnow()

    db.add(agent)
    db.commit()
    db.refresh(agent)

    return AgentCreateOut(**AgentOut.model_validate(agent).model_dump(), token=token)
