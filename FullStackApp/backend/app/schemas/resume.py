from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SkillOut(BaseModel):
    id:   int
    name: str

    model_config = {"from_attributes": True}


# ── Create / Update ───────────────────────────────────────
class ResumeUpdate(BaseModel):
    """Fields the user can edit after parsing."""
    parsed_name:      Optional[str]       = None
    parsed_education: Optional[str]       = None
    experience_years: Optional[int]       = None
    preferred_role:   Optional[str]       = None
    skills:           Optional[List[str]] = None   # replaces skill list


# ── Full Response ─────────────────────────────────────────
class ResumeOut(BaseModel):
    id:                 str
    user_id:            str
    file_name:          Optional[str]
    file_url:           Optional[str]
    raw_text:           Optional[str]
    parsed_name:        Optional[str]
    parsed_education:   Optional[str]
    experience_years:   int
    preferred_role:     Optional[str]
    predicted_category: Optional[str]
    confidence_score:   Optional[float]
    status:             str
    created_at:         datetime
    updated_at:         datetime

    model_config = {"from_attributes": True}


# ── Short form for lists / ranking ────────────────────────
class ResumeSummary(BaseModel):
    id:                 str
    parsed_name:        Optional[str]
    predicted_category: Optional[str]
    experience_years:   int
    preferred_role:     Optional[str]

    model_config = {"from_attributes": True}


# ── Parsed data returned immediately after upload ─────────
class ParsedResumeOut(BaseModel):
    resume_id:          str
    status:             str
    parsed_name:        Optional[str]
    parsed_education:   Optional[str]
    experience_years:   int
    preferred_role:     Optional[str]
    skills:             List[str]
    predicted_category: Optional[str]
    confidence_score:   Optional[float]
    message:            str
