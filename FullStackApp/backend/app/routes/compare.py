"""
POST /api/compare/candidates  — Compare 2-4 candidates side by side.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.resume import Resume
from app.models.analysis import ResumeAnalysis
from app.models.user import User
from app.utils.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/compare", tags=["Candidate Comparison"])

# ── Schemas ──

class CompareRequest(BaseModel):
    resume_ids: List[str]
    job_description_id: Optional[str] = None

    @field_validator("resume_ids")
    @classmethod
    def validate_count(cls, v):
        if len(v) < 2:
            raise ValueError("Provide at least 2 resume_ids to compare.")
        if len(v) > 4:
            raise ValueError("Maximum 4 resume_ids allowed.")
        return v

class CandidateEntry(BaseModel):
    resume_id: str
    name: Optional[str] = None
    overall_score: float
    keyword_score: float
    ats_score: Optional[float] = None
    matched_skills: List[str]
    missing_skills: List[str]
    experience_years: int

class CompareResponse(BaseModel):
    candidates: List[CandidateEntry]
    best_match_id: Optional[str] = None
    skill_union: List[str]


@router.post("/candidates", response_model=CompareResponse)
def compare_candidates(
    payload: CompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Compare 2-4 candidates based on their latest ResumeAnalysis scores."""
    candidates: List[CandidateEntry] = []
    all_skills: set = set()
    best_score = -1.0
    best_id: Optional[str] = None

    for rid in payload.resume_ids:
        resume = db.query(Resume).filter(Resume.id == rid).first()
        if not resume:
            raise HTTPException(status_code=404, detail=f"Resume {rid} not found.")

        # Find latest analysis (optionally filtered by job_description_id)
        q = db.query(ResumeAnalysis).filter(ResumeAnalysis.resume_id == rid)
        if payload.job_description_id:
            q = q.filter(ResumeAnalysis.job_description_id == payload.job_description_id)
        analysis = q.order_by(ResumeAnalysis.created_at.desc()).first()

        if not analysis:
            # Create a minimal placeholder so comparison still works
            analysis_data = CandidateEntry(
                resume_id=rid,
                name=resume.parsed_name,
                overall_score=0,
                keyword_score=0,
                ats_score=None,
                matched_skills=[],
                missing_skills=[],
                experience_years=resume.experience_years or 0,
            )
        else:
            matched = analysis.matched_keywords or []
            missing = analysis.missing_keywords or []
            all_skills.update(matched)
            all_skills.update(missing)
            analysis_data = CandidateEntry(
                resume_id=rid,
                name=resume.parsed_name,
                overall_score=analysis.overall_score,
                keyword_score=analysis.keyword_match_score,
                ats_score=analysis.ats_score,
                matched_skills=matched,
                missing_skills=missing,
                experience_years=resume.experience_years or 0,
            )

        candidates.append(analysis_data)
        if analysis_data.overall_score > best_score:
            best_score = analysis_data.overall_score
            best_id = rid

    return CompareResponse(
        candidates=candidates,
        best_match_id=best_id,
        skill_union=sorted(all_skills),
    )
