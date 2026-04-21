from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ── Request ───────────────────────────────────────────────
class MatchRequest(BaseModel):
    resume_id: str
    job_id:    str


# ── Score breakdown (shared sub-model) ────────────────────
class ScoreBreakdown(BaseModel):
    skill_score:      Optional[float] = None
    experience_score: Optional[float] = None
    education_score:  Optional[float] = None
    category_score:   Optional[float] = None
    total_score:      Optional[float] = None


# ── Response ──────────────────────────────────────────────
class MatchOut(BaseModel):
    id:               str
    resume_id:        str
    job_id:           str
    match_score:      float
    matched_skills:   List[str]
    missing_skills:   List[str]
    resume_top_terms: List[str]
    jd_top_terms:     List[str]
    # ── Composite scores ──────────────────────────────────
    skill_score:      Optional[float] = None
    experience_score: Optional[float] = None
    education_score:  Optional[float] = None
    category_score:   Optional[float] = None
    total_score:      Optional[float] = None
    created_at:       datetime

    model_config = {"from_attributes": True}


# ── Ranked candidate (used by GET /rank-candidates/{job_id}) ─
class RankedCandidate(BaseModel):
    rank:               int
    match_id:           str
    resume_id:          str
    candidate_name:     Optional[str]
    experience_years:   int
    predicted_category: Optional[str]
    match_score:        float
    matched_skills:     List[str]
    missing_skills:     List[str]
    # ── Composite scores ──────────────────────────────────
    skill_score:        Optional[float] = None
    experience_score:   Optional[float] = None
    education_score:    Optional[float] = None
    category_score:     Optional[float] = None
    total_score:        Optional[float] = None
    matched_at:         datetime


# ── Job recommendation (used by GET /recommend/{user_id}) ───
class JobRecommendation(BaseModel):
    job_id:        str
    title:         str
    role_category: Optional[str]
    location:      Optional[str]
    match_score:   float
    required_skills: List[str]
    experience_min:  int
    experience_max:  int
    already_applied: bool = False
