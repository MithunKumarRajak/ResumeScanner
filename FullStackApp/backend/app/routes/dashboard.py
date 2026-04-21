"""
Recruiter Dashboard & Candidate Filtering API — Steps 6 + 8

GET  /dashboard/summary                — platform-wide stats
GET  /dashboard/candidates             — filtered candidate list
GET  /dashboard/job/{job_id}/overview   — per-job match overview
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database.session   import get_db
from app.models.resume       import Resume
from app.models.job          import Job
from app.models.match        import Match
from app.models.skill        import Skill, ResumeSkill, JobSkill
from app.models.user         import User
from app.schemas.dashboard   import DashboardSummary, CandidateListItem, JobOverview
from app.services            import analytics as analytics_svc
from app.utils.auth          import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


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

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Platform-wide statistics for the recruiter dashboard.
    Returns total counts and average scores.
    """
    return analytics_svc.get_platform_summary(db)


@router.get("/candidates", response_model=List[CandidateListItem])
def list_candidates(
    db:           Session       = Depends(get_db),
    current_user: User          = Depends(get_current_active_user),
    # ── Filter params ────────────────────────────────────
    skills:       Optional[str] = Query(None, description="Comma-separated skill names to filter by"),
    min_exp:      Optional[int] = Query(None, ge=0, description="Minimum experience years"),
    max_exp:      Optional[int] = Query(None, ge=0, description="Maximum experience years"),
    category:     Optional[str] = Query(None, description="Filter by predicted category"),
    status:       Optional[str] = Query(None, description="Filter by resume status (parsed, classified, etc.)"),
    # ── Pagination ───────────────────────────────────────
    skip:         int           = Query(0, ge=0),
    limit:        int           = Query(50, ge=1, le=200),
    # ── Sorting ──────────────────────────────────────────
    sort_by:      str           = Query("created_at", description="Sort field: created_at, experience_years, confidence_score"),
    sort_order:   str           = Query("desc", description="Sort order: asc or desc"),
):
    """
    Paginated, filterable candidate list.
    
    Supports filtering by:
    - **skills** — comma-separated list (candidates must have ALL specified skills)
    - **min_exp / max_exp** — experience range
    - **category** — predicted job category
    - **status** — resume processing status
    """
    query = db.query(Resume)

    # ── Skill filter (AND logic — must have ALL skills) ──
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",") if s.strip()]
        if skill_list:
            # Subquery: resume IDs that have all requested skills
            for skill_name in skill_list:
                skill_subq = (
                    db.query(ResumeSkill.resume_id)
                    .join(Skill, Skill.id == ResumeSkill.skill_id)
                    .filter(Skill.name == skill_name)
                    .subquery()
                )
                query = query.filter(Resume.id.in_(skill_subq))

    # ── Experience filter ────────────────────────────────
    if min_exp is not None:
        query = query.filter(Resume.experience_years >= min_exp)
    if max_exp is not None:
        query = query.filter(Resume.experience_years <= max_exp)

    # ── Category filter ──────────────────────────────────
    if category:
        query = query.filter(Resume.predicted_category.ilike(f"%{category}%"))

    # ── Status filter ────────────────────────────────────
    if status:
        query = query.filter(Resume.status == status)

    # ── Sorting ──────────────────────────────────────────
    sort_column = getattr(Resume, sort_by, Resume.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # ── Pagination ───────────────────────────────────────
    resumes = query.offset(skip).limit(limit).all()

    # ── Build response with match stats ──────────────────
    result: List[CandidateListItem] = []
    for resume in resumes:
        # Get match stats for this resume
        match_stats = (
            db.query(
                func.count(Match.id).label("match_count"),
                func.avg(Match.match_score).label("avg_score"),
                func.max(Match.match_score).label("best_score"),
            )
            .filter(Match.resume_id == resume.id)
            .first()
        )

        result.append(CandidateListItem(
            resume_id          = resume.id,
            user_id            = resume.user_id,
            candidate_name     = resume.parsed_name,
            experience_years   = resume.experience_years,
            predicted_category = resume.predicted_category,
            confidence_score   = resume.confidence_score,
            education          = resume.parsed_education,
            skills             = _resume_skill_names(db, resume.id),
            status             = resume.status,
            match_count        = match_stats.match_count or 0,
            avg_match_score    = round(float(match_stats.avg_score), 2) if match_stats.avg_score else None,
            best_match_score   = round(float(match_stats.best_score), 2) if match_stats.best_score else None,
            created_at         = resume.created_at,
        ))

    return result


@router.get("/job/{job_id}/overview", response_model=JobOverview)
def get_job_overview(
    job_id:       str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """
    Per-job match overview for recruiters.
    Shows candidate count, average score, and score distribution.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # Match stats
    stats = (
        db.query(
            func.count(Match.id).label("total"),
            func.avg(Match.match_score).label("avg_score"),
            func.max(Match.match_score).label("top_score"),
        )
        .filter(Match.job_id == job_id)
        .first()
    )

    # Score distribution for this job
    distribution = []
    for low in range(0, 100, 20):
        high = low + 20
        count = (
            db.query(func.count(Match.id))
            .filter(
                Match.job_id == job_id,
                Match.match_score >= low,
                Match.match_score < high,
            )
            .scalar()
        ) or 0
        distribution.append({"range": f"{low}-{high}", "count": count})

    return JobOverview(
        job_id            = job.id,
        title             = job.title,
        required_skills   = _job_skill_names(db, job_id),
        total_candidates  = stats.total or 0,
        avg_match_score   = round(float(stats.avg_score or 0), 2),
        top_score         = round(float(stats.top_score or 0), 2),
        experience_min    = job.experience_min,
        experience_max    = job.experience_max,
        score_distribution = distribution,
    )
