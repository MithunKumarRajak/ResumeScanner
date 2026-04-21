"""
Pydantic schemas for analytics endpoints.
"""
from pydantic import BaseModel
from typing import Optional, List


# ── Skill Demand ──────────────────────────────────────────
class SkillDemand(BaseModel):
    skill:        str
    demand_count: int
    percentage:   float


# ── Skill Supply ──────────────────────────────────────────
class SkillSupply(BaseModel):
    skill:        str
    supply_count: int
    percentage:   float


# ── Match Distribution ────────────────────────────────────
class MatchDistribution(BaseModel):
    range: str
    low:   int
    high:  int
    count: int


# ── Category Breakdown ────────────────────────────────────
class CategoryBreakdown(BaseModel):
    category: str
    count:    int


# ── Experience Distribution ───────────────────────────────
class ExperienceDistribution(BaseModel):
    range: str
    count: int


# ── Top Candidate ─────────────────────────────────────────
class TopCandidate(BaseModel):
    resume_id:          str
    candidate_name:     Optional[str]
    predicted_category: Optional[str]
    experience_years:   int
    avg_score:          float
    match_count:        int
    best_match_score:   float
