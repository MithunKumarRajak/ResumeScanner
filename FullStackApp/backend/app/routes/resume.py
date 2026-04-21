"""
POST /upload-resume          — upload PDF/DOCX, parse + classify in background
GET  /resumes                — list current user's resumes
GET  /resume/{id}            — get single resume with skills
PUT  /resume/{id}            — update editable fields
DELETE /resume/{id}          — delete resume + file
"""
import logging
from typing import List

from fastapi import (
    APIRouter, BackgroundTasks, Depends,
    File, HTTPException, UploadFile, status,
)
from sqlalchemy.orm import Session

from app.database.session   import get_db
from app.models.resume       import Resume
from app.models.skill        import Skill, ResumeSkill, SkillSource
from app.models.user         import User
from app.schemas.resume      import ParsedResumeOut, ResumeOut, ResumeUpdate, ResumeSummary
from app.services            import parser as parser_svc
from app.services            import classifier as classifier_svc
from app.utils.auth          import get_current_active_user
from app.utils.file_handler  import validate_file, save_upload_file, delete_file

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Resumes"])


# ── Helpers ───────────────────────────────────────────────

def _get_or_create_skill(db: Session, name: str) -> Skill:
    skill = db.query(Skill).filter(Skill.name == name.lower()).first()
    if not skill:
        skill = Skill(name=name.lower())
        db.add(skill)
        db.flush()
    return skill


def _sync_resume_skills(db: Session, resume: Resume, skill_names: List[str],
                        source: SkillSource = SkillSource.parsed):
    """Replace all skills on a resume with the provided list."""
    db.query(ResumeSkill).filter(ResumeSkill.resume_id == resume.id).delete()
    for name in skill_names:
        skill = _get_or_create_skill(db, name)
        db.add(ResumeSkill(resume_id=resume.id, skill_id=skill.id, source=source))


def _resume_skill_names(db: Session, resume_id: str) -> List[str]:
    rows = (
        db.query(Skill.name)
        .join(ResumeSkill, ResumeSkill.skill_id == Skill.id)
        .filter(ResumeSkill.resume_id == resume_id)
        .all()
    )
    return [r.name for r in rows]


# ── Background task: parse + classify ─────────────────────

def _parse_and_classify(resume_id: str, file_url: str, db_factory):
    """Runs after the upload response is sent."""
    db: Session = db_factory()
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            return

        # 1. Extract text
        raw_text = parser_svc.extract_text(file_url)
        resume.raw_text = raw_text
        resume.status   = "parsed"

        # 2. NLP parse
        parsed = parser_svc.parse_resume(raw_text)
        resume.parsed_name      = parsed["name"]
        resume.parsed_education = parsed["education"]
        resume.experience_years = parsed["experience_years"]

        # 3. Sync skills
        _sync_resume_skills(db, resume, parsed["skills"], SkillSource.parsed)

        # 4. Classify
        clf = classifier_svc.classify_resume(raw_text)
        resume.predicted_category = clf["predicted_category"]
        resume.confidence_score   = clf["confidence"]
        resume.status             = "classified"

        db.commit()
        logger.info(f"✅ Resume {resume_id} parsed & classified as '{clf['predicted_category']}'")

    except Exception as e:
        db.rollback()
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if resume:
            resume.status        = "error"
            resume.error_message = str(e)
            db.commit()
        logger.error(f"❌ Parse/classify error for {resume_id}: {e}")
    finally:
        db.close()


# ── Routes ────────────────────────────────────────────────

@router.post("/upload-resume", response_model=ParsedResumeOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a PDF or DOCX resume.
    - Validates file type & size
    - Saves to local storage
    - Triggers async parse + classify via BackgroundTasks
    - Returns resume ID immediately (status: pending)
    """
    validate_file(file)

    file_url, file_name, file_size = await save_upload_file(file, current_user.id)

    resume = Resume(
        user_id   = current_user.id,
        file_name = file_name,
        file_url  = file_url,
        file_size = file_size,
        status    = "pending",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # Kick off parsing in background (non-blocking)
    from app.database.session import SessionLocal
    background_tasks.add_task(_parse_and_classify, resume.id, file_url, SessionLocal)

    return ParsedResumeOut(
        resume_id          = resume.id,
        status             = "pending",
        parsed_name        = None,
        parsed_education   = None,
        experience_years   = 0,
        preferred_role     = None,
        skills             = [],
        predicted_category = None,
        confidence_score   = None,
        message            = "Resume uploaded. Parsing in progress — poll GET /resume/{id} for results.",
    )


@router.get("/resumes", response_model=List[ResumeSummary])
def list_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all resumes belonging to the current user."""
    return db.query(Resume).filter(Resume.user_id == current_user.id).all()


@router.get("/resume/{resume_id}", response_model=ResumeOut)
def get_resume(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single resume. Includes parsed fields and classification."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return resume


@router.put("/resume/{resume_id}", response_model=ResumeOut)
def update_resume(
    resume_id: str,
    payload:   ResumeUpdate,
    db:        Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Edit extracted resume fields.
    Accepts: parsed_name, parsed_education, experience_years, preferred_role, skills[].
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if payload.parsed_name      is not None: resume.parsed_name      = payload.parsed_name
    if payload.parsed_education is not None: resume.parsed_education = payload.parsed_education
    if payload.experience_years is not None: resume.experience_years = payload.experience_years
    if payload.preferred_role   is not None: resume.preferred_role   = payload.preferred_role

    if payload.skills is not None:
        _sync_resume_skills(db, resume, payload.skills, SkillSource.manual)

    db.commit()
    db.refresh(resume)
    return resume


@router.delete("/resume/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a resume and its uploaded file."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if resume.file_url:
        delete_file(resume.file_url)

    db.delete(resume)
    db.commit()
