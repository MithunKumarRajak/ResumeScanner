"""
POST /upload-resume          — upload PDF/DOCX, parse + classify in background
GET  /resumes                — list current user's resumes
GET  /resume/{id}            — get single resume with skills
PUT  /resume/{id}            — update editable fields
DELETE /resume/{id}          — delete resume + file
"""
from app.services.common import resume_skill_names as _resume_skill_names
import logging
import secrets
from typing import List, Optional

from fastapi import (
    APIRouter, BackgroundTasks, Depends,
    File, HTTPException, UploadFile, status,
)
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.resume import Resume
from app.models.skill import Skill, ResumeSkill, SkillSource
from app.models.user import User
from app.schemas.resume import ParsedResumeOut, ResumeOut, ResumeUpdate, ResumeSummary
from app.services import parser as parser_svc
from app.services import classifier as classifier_svc
from app.utils.auth import get_current_active_user, get_optional_current_user, get_password_hash
from app.utils.file_handler import validate_file, save_upload_file, delete_file

# Security pipeline tools — scan runs at upload time; audit logger records each step.
from app.tools.security_scanner import scan_file as _scan_file
from app.tools.audit_logger import log_step as _log_step, build_scan_detail as _build_scan_detail

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Resumes"])


#  Helpers ─

def _get_or_create_skill(db: Session, name: str) -> Skill:
    skill = db.query(Skill).filter(Skill.name == name.lower()).first()
    if not skill:
        skill = Skill(name=name.lower())
        db.add(skill)
        db.flush()
    return skill


def _get_or_create_guest_user(db: Session) -> User:
    """Get or create a guest user for anonymous uploads."""
    guest_email = "guest@resumescanner.local"
    guest = db.query(User).filter(User.email == guest_email).first()
    if not guest:
        guest = User(
            email=guest_email,
            full_name="Guest User",
            hashed_password=get_password_hash(secrets.token_hex(16)),
            role="candidate",
            is_active=True,
        )
        db.add(guest)
        db.commit()
        db.refresh(guest)
    return guest


def _sync_resume_skills(db: Session, resume: Resume, skill_names: List[str],
                        source: SkillSource = SkillSource.parsed):
    """Replace all skills on a resume with the provided list."""
    db.query(ResumeSkill).filter(ResumeSkill.resume_id == resume.id).delete()
    for name in skill_names:
        skill = _get_or_create_skill(db, name)
        db.add(ResumeSkill(resume_id=resume.id, skill_id=skill.id, source=source))


#  Background task: parse + classify ─

import json as _json

# Orchestrator — the single entry point for the full agentic security pipeline.
# Both this background task and cli.py use the same function.
from app.agents.orchestrator import run_security_pipeline as _run_security_pipeline


def _parse_and_classify(resume_id: str, file_url: str, db_factory):
    """
    Background task: run the full agentic security pipeline on the uploaded file.

    Flow (mirrors cli.py's `score` command exactly):
      1. Read bytes from the saved file path (file was already persisted before this task runs)
      2. Run run_security_pipeline: scan → extract → redact → LLM reasoning → score_resume
      3. Also run NLP parsing (parser_svc.parse_resume) for recruiter-facing fields
         (name, education, skills). These use raw_text, not the redacted version —
         recruiters need real contact info in the UI.
      4. Persist all results onto the Resume row (classification, pii counts, status).

    GUARDRAILS (enforced by run_security_pipeline itself):
      - scan_file and redact_pii are hardcoded and always run — not LLM-controlled.
      - Redacted text goes to LLM calls only; raw_text is stored in DB for recruiters.
    """
    db: Session = db_factory()
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            return

        # Read file bytes from disk (already saved during upload).
        from pathlib import Path
        file_path = Path(file_url)
        if not file_path.exists():
            logger.error(f"[_parse_and_classify] File not found: {file_url}")
            resume.status = "error"
            resume.error_message = "Upload file missing from disk."
            db.commit()
            return
        file_bytes = file_path.read_bytes()
        filename = resume.file_name or file_path.name

        # ---------------------------------------------------------------
        # STEP A: Run full agentic security pipeline
        # (scan → extract text → redact → LLM reasoning → score_resume)
        # This is the EXACT same call that cli.py uses.
        # ---------------------------------------------------------------
        pipeline_result = _run_security_pipeline(
            file_bytes=file_bytes,
            filename=filename,
            db_session=db,
            resume_id=resume_id,
        )

        # ---------------------------------------------------------------
        # STEP B: NLP parsing for recruiter-facing fields
        # Uses raw_text (not redacted) so recruiters see real contact info.
        # ---------------------------------------------------------------
        raw_text = parser_svc.extract_text(file_url)
        resume.raw_text = raw_text
        resume.status = "parsed"

        parsed = parser_svc.parse_resume(raw_text)
        resume.parsed_name = parsed["name"]
        resume.parsed_education = parsed["education"]
        resume.experience_years = parsed["experience_years"]

        _sync_resume_skills(db, resume, parsed["skills"], SkillSource.parsed)

        # ---------------------------------------------------------------
        # STEP C: Persist pipeline results
        # ---------------------------------------------------------------
        score = pipeline_result.get("score", {})
        if score and not score.get("error"):
            resume.predicted_category = score.get("predicted_category", "Unknown")
            resume.confidence_score = score.get("confidence", 0.0)
        else:
            # Fallback: if orchestrator scoring failed, mark unknown
            resume.predicted_category = "Unknown"
            resume.confidence_score = 0.0

        resume.pii_redaction_count = pipeline_result.get("pii_redaction_count", 0)
        resume.pii_types_found = _json.dumps(pipeline_result.get("pii_types_found", []))
        resume.status = "classified"

        db.commit()
        logger.info(
            f"[_parse_and_classify] Resume {resume_id} processed via orchestrator. "
            f"Category: '{resume.predicted_category}', "
            f"PII redacted: {resume.pii_redaction_count}"
        )

    except Exception as e:
        db.rollback()
        try:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if resume:
                resume.status = "error"
                resume.error_message = str(e)
                db.commit()
        except Exception:
            pass
        logger.error(f"[_parse_and_classify] Error for {resume_id}: {e}")
    finally:
        db.close()




#  Routes

@router.post("/upload-resume", response_model=ParsedResumeOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db:   Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Upload a PDF or DOCX resume.
    - Validates file type & size
    - Runs magic-byte security scan (rejects mismatched/malicious files)
    - Saves to local storage
    - Triggers async parse + classify via BackgroundTasks
    - Returns resume ID immediately (status: pending) with security scan result
    - Works for authenticated users and guests
    """
    # Read file bytes first (needed for magic-byte scan before saving).
    content = await file.read()

    # SECURITY SCAN — runs BEFORE the file is saved to disk.
    # This is the first step of the deterministic security pre-pipeline.
    # If the scan fails, we reject immediately and never persist the file.
    scan_result = _scan_file(content, file.filename or "unknown")
    if not scan_result["passed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security scan failed: {scan_result.get('reason', 'File type not allowed.')} "
                   f"(Detected: {scan_result.get('detected_type', 'unknown')})",
        )

    # Also run the existing content-type / extension check for defence-in-depth.
    validate_file(file)

    # Use authenticated user if available, otherwise use guest user
    user_for_resume = current_user if current_user else _get_or_create_guest_user(db)

    # Write file bytes to disk (we already read them above for the scan).
    import uuid
    from pathlib import Path
    from app.config import settings
    upload_dir = Path(settings.UPLOAD_DIR) / str(user_for_resume.id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "resume").suffix.lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    dest = upload_dir / unique_name
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE // (1024 * 1024)} MB limit.",
        )
    dest.write_bytes(content)
    file_url = str(dest).replace("\\", "/")
    file_name = file.filename or unique_name
    file_size = len(content)

    resume = Resume(
        user_id=user_for_resume.id,
        file_name=file_name,
        file_url=file_url,
        file_size=file_size,
        status="pending",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # Log the scan step to the audit trail now that we have a resume_id.
    _log_step(
        db_session=db,
        step_name="scan",
        status="passed",
        detail=_build_scan_detail(scan_result),
        resume_id=resume.id,
    )

    # Kick off parsing in background (non-blocking)
    from app.database.session import SessionLocal
    background_tasks.add_task(
        _parse_and_classify, resume.id, file_url, SessionLocal)

    return ParsedResumeOut(
        resume_id=resume.id,
        status="pending",
        parsed_name=None,
        parsed_education=None,
        experience_years=0,
        preferred_role=None,
        skills=[],
        predicted_category=None,
        confidence_score=None,
        message="Resume uploaded. Parsing in progress — poll GET /resume/{id} for results.",
        scan_passed=scan_result["passed"],
        scan_reason=scan_result.get("reason"),
        pii_redaction_count=None,  # populated after background task runs
        pii_types_found=None,
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

    if payload.parsed_name is not None:
        resume.parsed_name = payload.parsed_name
    if payload.parsed_education is not None:
        resume.parsed_education = payload.parsed_education
    if payload.experience_years is not None:
        resume.experience_years = payload.experience_years
    if payload.preferred_role is not None:
        resume.preferred_role = payload.preferred_role

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
