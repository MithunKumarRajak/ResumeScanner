"""
POST   /jobs          — create a job posting
GET    /jobs          — list active jobs
GET    /jobs/{id}     — get job details
PUT    /jobs/{id}     — update job
DELETE /jobs/{id}     — remove job
GET    /categories    — list ML model categories (also exposed here)
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.job        import Job
from app.models.skill      import Skill, JobSkill
from app.models.user       import User, UserRole
from app.schemas.job       import JobCreate, JobOut, JobSummary, JobUpdate
from app.services          import classifier as classifier_svc
from app.utils.auth        import get_current_active_user

router = APIRouter(tags=["Jobs"])


# ── Helpers ───────────────────────────────────────────────

def _get_or_create_skill(db: Session, name: str) -> Skill:
    skill = db.query(Skill).filter(Skill.name == name.lower()).first()
    if not skill:
        skill = Skill(name=name.lower())
        db.add(skill)
        db.flush()
    return skill


def _sync_job_skills(db: Session, job: Job, skill_names: List[str]):
    db.query(JobSkill).filter(JobSkill.job_id == job.id).delete()
    for name in skill_names:
        skill = _get_or_create_skill(db, name)
        db.add(JobSkill(job_id=job.id, skill_id=skill.id, is_required=True))


def _job_skill_names(db: Session, job_id: str) -> List[str]:
    rows = (
        db.query(Skill.name)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .filter(JobSkill.job_id == job_id)
        .all()
    )
    return [r.name for r in rows]


def _build_job_out(db: Session, job: Job) -> JobOut:
    return JobOut(
        id              = job.id,
        created_by      = job.created_by,
        title           = job.title,
        description     = job.description,
        required_skills = _job_skill_names(db, job.id),
        experience_min  = job.experience_min,
        experience_max  = job.experience_max,
        role_category   = job.role_category,
        location        = job.location,
        is_active       = job.is_active,
        created_at      = job.created_at,
    )


# ── Routes ────────────────────────────────────────────────

@router.post("/jobs", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    payload:      JobCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """Create a new job posting. Any authenticated user can post a job."""
    job = Job(
        created_by     = current_user.id,
        title          = payload.title,
        description    = payload.description,
        experience_min = payload.experience_min,
        experience_max = payload.experience_max,
        role_category  = payload.role_category,
        location       = payload.location,
    )
    db.add(job)
    db.flush()
    _sync_job_skills(db, job, payload.required_skills)
    db.commit()
    db.refresh(job)
    return _build_job_out(db, job)


@router.get("/jobs", response_model=List[JobOut])
def list_jobs(
    db:            Session = Depends(get_db),
    role_category: Optional[str] = Query(None),
    location:      Optional[str] = Query(None),
    active_only:   bool          = Query(True),
    skip:          int           = Query(0, ge=0),
    limit:         int           = Query(50, le=200),
):
    """
    List job postings with optional filters.
    No auth required — public endpoint.
    """
    q = db.query(Job)
    if active_only:
        q = q.filter(Job.is_active == True)  # noqa: E712
    if role_category:
        q = q.filter(Job.role_category.ilike(f"%{role_category}%"))
    if location:
        q = q.filter(Job.location.ilike(f"%{location}%"))

    jobs = q.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    return [_build_job_out(db, j) for j in jobs]


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get a single job by ID (public)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return _build_job_out(db, job)


@router.put("/jobs/{job_id}", response_model=JobOut)
def update_job(
    job_id:       str,
    payload:      JobUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """Update a job posting. Only the creator can edit."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if payload.title          is not None: job.title          = payload.title
    if payload.description    is not None: job.description    = payload.description
    if payload.experience_min is not None: job.experience_min = payload.experience_min
    if payload.experience_max is not None: job.experience_max = payload.experience_max
    if payload.role_category  is not None: job.role_category  = payload.role_category
    if payload.location       is not None: job.location       = payload.location
    if payload.is_active      is not None: job.is_active      = payload.is_active

    if payload.required_skills is not None:
        _sync_job_skills(db, job, payload.required_skills)

    db.commit()
    db.refresh(job)
    return _build_job_out(db, job)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id:       str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """Delete a job. Only the creator can delete."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    db.delete(job)
    db.commit()


@router.get("/categories")
def get_categories():
    """Return all job categories known to the ML model."""
    return {"categories": classifier_svc.get_categories()}
