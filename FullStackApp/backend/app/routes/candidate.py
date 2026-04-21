"""
Candidate-facing API — Step 9

GET  /candidate/resume-history    — all resumes with match stats
GET  /candidate/recommendations   — personalised job recommendations
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session   import get_db
from app.models.resume       import Resume
from app.models.job          import Job
from app.models.match        import Match
from app.models.skill        import Skill, ResumeSkill, JobSkill
from app.models.user         import User
from app.schemas.match       import JobRecommendation
from app.services            import matcher as matcher_svc
from app.utils.auth          import get_current_active_user

router = APIRouter(prefix="/candidate", tags=["Candidate"])


# ── Schemas (local — only used here) ──────────────────────
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ResumeHistoryItem(BaseModel):
    resume_id:          str
    file_name:          Optional[str]
    parsed_name:        Optional[str]
    predicted_category: Optional[str]
    confidence_score:   Optional[float]
    experience_years:   int
    education:          Optional[str]
    skills:             List[str]
    status:             str
    match_count:        int = 0
    best_match_score:   Optional[float] = None
    avg_match_score:    Optional[float] = None
    created_at:         datetime
    updated_at:         datetime

    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────

def _resume_skill_names(db: Session, resume_id: str) -> List[str]:
    rows = (
        db.query(Skill.name)
        .join(ResumeSkill, ResumeSkill.skill_id == Skill.id)
        .filter(ResumeSkill.resume_id == resume_id)
        .all()
    )
    return [r.name for r in rows]


def _job_skill_names(db: Session, job_id: str) -> List[str]:
    rows = (
        db.query(Skill.name)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .filter(JobSkill.job_id == job_id)
        .all()
    )
    return [r.name for r in rows]


# ── Routes ────────────────────────────────────────────────

@router.get("/resume-history", response_model=List[ResumeHistoryItem])
def get_resume_history(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """
    Complete resume history for the current user.
    
    Returns all uploaded resumes with:
    - Parsing status and classification results
    - Match statistics (how many jobs matched, best/avg score)
    - Extracted skills and education
    """
    resumes = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .all()
    )

    result: List[ResumeHistoryItem] = []
    for resume in resumes:
        # Match stats
        match_stats = (
            db.query(
                func.count(Match.id).label("match_count"),
                func.avg(Match.match_score).label("avg_score"),
                func.max(Match.match_score).label("best_score"),
            )
            .filter(Match.resume_id == resume.id)
            .first()
        )

        result.append(ResumeHistoryItem(
            resume_id          = resume.id,
            file_name          = resume.file_name,
            parsed_name        = resume.parsed_name,
            predicted_category = resume.predicted_category,
            confidence_score   = resume.confidence_score,
            experience_years   = resume.experience_years,
            education          = resume.parsed_education,
            skills             = _resume_skill_names(db, resume.id),
            status             = resume.status,
            match_count        = match_stats.match_count or 0,
            best_match_score   = round(float(match_stats.best_score), 2) if match_stats.best_score else None,
            avg_match_score    = round(float(match_stats.avg_score), 2) if match_stats.avg_score else None,
            created_at         = resume.created_at,
            updated_at         = resume.updated_at,
        ))

    return result


@router.get("/recommendations", response_model=List[JobRecommendation])
def get_my_recommendations(
    db:      Session = Depends(get_db),
    top_n:   int     = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
):
    """
    Personalised job recommendations for the current user.
    
    Automatically uses the user's most recently classified resume.
    No need to pass user_id — derived from JWT token.
    """
    # Get the user's most recently classified resume
    resume = (
        db.query(Resume)
        .filter(
            Resume.user_id == current_user.id,
            Resume.status  == "classified",
            Resume.raw_text != None,
        )
        .order_by(Resume.created_at.desc())
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="No classified resume found. Upload and process a resume first.",
        )

    # All active jobs
    all_jobs = db.query(Job).filter(Job.is_active == True).all()  # noqa: E712

    # Existing match scores
    matched_map: dict = {}
    existing_matches = db.query(Match).filter(Match.resume_id == resume.id).all()
    for m in existing_matches:
        matched_map[m.job_id] = m.match_score

    recommendations: List[JobRecommendation] = []

    for job in all_jobs:
        required_skills = _job_skill_names(db, job.id)

        if job.id in matched_map:
            score = matched_map[job.id]
        else:
            try:
                result = matcher_svc.compute_match(
                    resume_text     = resume.raw_text,
                    job_text        = job.description,
                    required_skills = required_skills,
                )
                score = result["match_score"]
            except Exception:
                score = 0.0

        recommendations.append(
            JobRecommendation(
                job_id          = job.id,
                title           = job.title,
                role_category   = job.role_category,
                location        = job.location,
                match_score     = round(score, 2),
                required_skills = required_skills,
                experience_min  = job.experience_min,
                experience_max  = job.experience_max,
                already_applied = job.id in matched_map,
            )
        )

    recommendations.sort(key=lambda r: r.match_score, reverse=True)
    return recommendations[:top_n]
