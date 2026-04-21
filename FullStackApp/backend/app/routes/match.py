"""
POST /match                        — match a resume to a job, store result
GET  /rank-candidates/{job_id}     — ranked candidates for a job
GET  /matches/{resume_id}          — all matches for a resume
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session  import get_db
from app.models.job         import Job
from app.models.match       import Match
from app.models.resume      import Resume
from app.models.skill       import Skill, JobSkill
from app.models.user        import User
from app.schemas.match      import MatchOut, MatchRequest, RankedCandidate
from app.services           import matcher as matcher_svc
from app.services           import scorer as scorer_svc
from app.utils.auth         import get_current_active_user

router = APIRouter(tags=["Matching"])


def _job_skill_names(db: Session, job_id: str) -> List[str]:
    rows = (
        db.query(Skill.name)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .filter(JobSkill.job_id == job_id)
        .all()
    )
    return [r.name for r in rows]


@router.post("/match", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
def match_resume_to_job(
    payload:      MatchRequest,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """
    Match a resume against a job description using TF-IDF cosine similarity.

    - Validates both IDs exist
    - Runs matcher service
    - Upserts the match result in the DB
    Returns full match breakdown.
    """
    # Fetch & validate resume
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if not resume.raw_text:
        raise HTTPException(
            status_code=400,
            detail="Resume has not been parsed yet. Wait for status='classified' before matching.",
        )

    # Fetch & validate job
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    required_skills = _job_skill_names(db, job.id)

    # Run matching
    try:
        result = matcher_svc.compute_match(
            resume_text     = resume.raw_text,
            job_text        = job.description,
            required_skills = required_skills,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Compute composite score
    scores = scorer_svc.compute_resume_score(
        matched_skills      = result["matched_skills"],
        required_skills     = required_skills,
        candidate_experience = resume.experience_years or 0,
        exp_min             = job.experience_min,
        exp_max             = job.experience_max,
        education_text      = resume.parsed_education,
        predicted_category  = resume.predicted_category,
        job_role_category   = job.role_category,
    )

    # Upsert: if a match already exists for this pair, update it
    existing = (
        db.query(Match)
        .filter(Match.resume_id == resume.id, Match.job_id == job.id)
        .first()
    )
    if existing:
        existing.match_score      = result["match_score"]
        existing.matched_skills   = result["matched_skills"]
        existing.missing_skills   = result["missing_skills"]
        existing.resume_top_terms = result["resume_top_terms"]
        existing.jd_top_terms     = result["jd_top_terms"]
        existing.skill_score      = scores["skill_score"]
        existing.experience_score = scores["experience_score"]
        existing.education_score  = scores["education_score"]
        existing.category_score   = scores["category_score"]
        existing.total_score      = scores["total_score"]
        db.commit()
        db.refresh(existing)
        return existing

    match = Match(
        resume_id        = resume.id,
        job_id           = job.id,
        match_score      = result["match_score"],
        matched_skills   = result["matched_skills"],
        missing_skills   = result["missing_skills"],
        resume_top_terms = result["resume_top_terms"],
        jd_top_terms     = result["jd_top_terms"],
        skill_score      = scores["skill_score"],
        experience_score = scores["experience_score"],
        education_score  = scores["education_score"],
        category_score   = scores["category_score"],
        total_score      = scores["total_score"],
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.get("/rank-candidates/{job_id}", response_model=List[RankedCandidate])
def rank_candidates(
    job_id: str,
    db:     Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Return all candidates matched to a job, sorted by match score descending.
    Each row also includes candidate name, experience, and category.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # Sort by total_score (composite) if available, otherwise match_score
    matches = (
        db.query(Match)
        .filter(Match.job_id == job_id)
        .order_by(
            Match.total_score.desc().nullslast(),
            Match.match_score.desc(),
        )
        .all()
    )

    ranked: List[RankedCandidate] = []
    for i, m in enumerate(matches, start=1):
        resume = db.query(Resume).filter(Resume.id == m.resume_id).first()
        ranked.append(RankedCandidate(
            rank               = i,
            match_id           = m.id,
            resume_id          = m.resume_id,
            candidate_name     = resume.parsed_name if resume else "Unknown",
            experience_years   = resume.experience_years if resume else 0,
            predicted_category = resume.predicted_category if resume else None,
            match_score        = m.match_score,
            matched_skills     = m.matched_skills or [],
            missing_skills     = m.missing_skills or [],
            skill_score        = m.skill_score,
            experience_score   = m.experience_score,
            education_score    = m.education_score,
            category_score     = m.category_score,
            total_score        = m.total_score,
            matched_at         = m.created_at,
        ))
    return ranked


@router.get("/matches/{resume_id}", response_model=List[MatchOut])
def get_resume_matches(
    resume_id:    str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """List all matches for a given resume, sorted by score."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    return (
        db.query(Match)
        .filter(Match.resume_id == resume_id)
        .order_by(Match.match_score.desc())
        .all()
    )
