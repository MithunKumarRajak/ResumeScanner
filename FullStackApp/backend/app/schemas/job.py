from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Create ────────────────────────────────────────────────
class JobCreate(BaseModel):
    title:          str
    description:    str
    required_skills: List[str] = []
    experience_min:  int       = 0
    experience_max:  int       = 10
    role_category:   Optional[str] = None
    location:        Optional[str] = None


# ── Update ────────────────────────────────────────────────
class JobUpdate(BaseModel):
    title:           Optional[str]       = None
    description:     Optional[str]       = None
    required_skills: Optional[List[str]] = None
    experience_min:  Optional[int]       = None
    experience_max:  Optional[int]       = None
    role_category:   Optional[str]       = None
    location:        Optional[str]       = None
    is_active:       Optional[bool]      = None


# ── Response ──────────────────────────────────────────────
class JobOut(BaseModel):
    id:             str
    created_by:     str
    title:          str
    description:    str
    required_skills: List[str]
    experience_min:  int
    experience_max:  int
    role_category:   Optional[str]
    location:        Optional[str]
    is_active:       bool
    created_at:      datetime

    model_config = {"from_attributes": True}


class JobSummary(BaseModel):
    id:            str
    title:         str
    role_category: Optional[str]
    location:      Optional[str]
    experience_min: int
    experience_max: int
    is_active:     bool

    model_config = {"from_attributes": True}
