"""
GET /recommend/{user_id}   — personalised job recommendations for a candidate

Strategy:
  1. Find the user's most recently classified resume.
  2. For jobs already matched → use stored score.
  3. For unmatched jobs      → compute quick similarity on-the-fly.
  4. Sort all by score (desc) and return top N.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session  import get_db
from app.models.job         import Job
from app.models.match       import Match
from app.models.resume      import Resume
from app.models.skill       import Skill, JobSkill
from app.models.user        import User
from app.schemas.match      import JobRecommendation
from app.services           import matcher as matcher_svc
from app.utils.auth         import get_current_active_user

router = APIRouter(tags=["Recommendations"])


def _job_skill_names(db: Session, job_id: str) -> List[str]:
    rows = (
        db.query(Skill.name)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .filter(JobSkill.job_id == job_id)
        .all()
    )
    return [r.name for r in rows]


@router.get("/recommend/{user_id}", response_model=List[JobRecommendation])
def recommend_jobs(
    user_id: str,
    db:      Session = Depends(get_db),
    top_n:   int     = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
):
    """
    Return personalised job recommendations for a user (candidate).
    
    Uses:
    - Stored match scores for jobs already analysed.
    - Live TF-IDF cosine similarity for all other active jobs.
    """
    # Only the user themselves (or an admin) can view recommendations
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Get the user's most recently classified resume
    resume = (
        db.query(Resume)
        .filter(
            Resume.user_id == user_id,
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

    # Build a set of already-matched job IDs
    matched_map: dict = {}
    existing_matches = db.query(Match).filter(Match.resume_id == resume.id).all()
    for m in existing_matches:
        matched_map[m.job_id] = m.match_score

    recommendations: List[JobRecommendation] = []

    for job in all_jobs:
        required_skills = _job_skill_names(db, job.id)

        if job.id in matched_map:
            # Use cached score
            score = matched_map[job.id]
        else:
            # Compute live
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

    # Sort by score descending and return top N
    recommendations.sort(key=lambda r: r.match_score, reverse=True)
    return recommendations[:top_n]
