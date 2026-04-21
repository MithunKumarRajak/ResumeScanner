"""
Pydantic schemas for the recruiter dashboard and candidate filtering.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Platform Summary ──────────────────────────────────────
class DashboardSummary(BaseModel):
    total_resumes:   int
    total_jobs:      int
    active_jobs:     int
    total_matches:   int
    avg_match_score: float
    avg_total_score: float


# ── Candidate List Item (filtered view) ───────────────────
class CandidateListItem(BaseModel):
    resume_id:          str
    user_id:            str
    candidate_name:     Optional[str]
    experience_years:   int
    predicted_category: Optional[str]
    confidence_score:   Optional[float]
    education:          Optional[str]
    skills:             List[str]
    status:             str
    match_count:        int = 0
    avg_match_score:    Optional[float] = None
    best_match_score:   Optional[float] = None
    created_at:         datetime

    model_config = {"from_attributes": True}


# ── Job Overview (per-job dashboard) ──────────────────────
class JobOverview(BaseModel):
    job_id:           str
    title:            str
    required_skills:  List[str]
    total_candidates: int
    avg_match_score:  float
    top_score:        float
    experience_min:   int
    experience_max:   int
    score_distribution: List[dict]  # [{range, count}, ...]
