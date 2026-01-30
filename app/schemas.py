from pydantic import BaseModel
from typing import Dict, Optional

class EventCreate(BaseModel):
    event_type: str
    host: str
    user: str
    action: str
    details: Optional[Dict] = {}
