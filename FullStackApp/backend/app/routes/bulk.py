"""
POST /api/bulk/upload           — Upload multiple resumes for batch processing.
GET  /api/bulk/{id}/status      — Check bulk job progress.
"""
import os, uuid, logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db, SessionLocal
from app.models.resume import Resume
from app.models.bulk_job import BulkJob, BulkJobStatus
from app.models.user import User
from app.services import parser as parser_svc, classifier as classifier_svc
from app.utils.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bulk", tags=["Bulk Processing"])

MAX_BULK_FILES = 50
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB per file
ALLOWED_EXTS = {".pdf", ".docx"}

# ── Schemas ──

class BulkUploadResponse(BaseModel):
    bulk_job_id: str
    total_files: int
    status: str

class BulkStatusResponse(BaseModel):
    status: str
    total_resumes: int
    processed_count: int
    progress_percent: float
    results: Optional[List[dict]] = None

# ── Background processing ──

def _process_bulk(bulk_job_id: str, file_infos: List[dict]):
    """Process all uploaded files in background."""
    db = SessionLocal()
    try:
        bulk = db.query(BulkJob).filter(BulkJob.id == bulk_job_id).first()
        if not bulk:
            return
        bulk.status = BulkJobStatus.processing
        db.commit()

        results = []
        for info in file_infos:
            resume_id = info["resume_id"]
            file_url = info["file_url"]
            result = {"resume_id": resume_id, "file_name": info["file_name"], "status": "pending"}
            try:
                raw_text = parser_svc.extract_text(file_url)
                resume = db.query(Resume).filter(Resume.id == resume_id).first()
                if resume:
                    resume.raw_text = raw_text
                    resume.status = "parsed"
                    parsed = parser_svc.parse_resume(raw_text)
                    resume.parsed_name = parsed["name"]
                    resume.parsed_education = parsed["education"]
                    resume.experience_years = parsed["experience_years"]
                    try:
                        clf = classifier_svc.classify_resume(raw_text)
                        resume.predicted_category = clf["predicted_category"]
                        resume.confidence_score = clf["confidence"]
                        resume.status = "classified"
                    except Exception:
                        pass  # classifier may not be loaded
                    result["status"] = "success"
                    result["category"] = resume.predicted_category
            except Exception as e:
                result["status"] = "error"
                result["error"] = str(e)
                resume = db.query(Resume).filter(Resume.id == resume_id).first()
                if resume:
                    resume.status = "error"
                    resume.error_message = str(e)

            results.append(result)
            bulk.processed_count += 1
            db.commit()

        bulk.results = results
        bulk.status = BulkJobStatus.completed
        bulk.completed_at = datetime.utcnow()
        db.commit()
        logger.info(f"Bulk job {bulk_job_id} completed: {len(results)} files")
    except Exception as e:
        logger.error(f"Bulk job {bulk_job_id} failed: {e}")
        bulk = db.query(BulkJob).filter(BulkJob.id == bulk_job_id).first()
        if bulk:
            bulk.status = BulkJobStatus.failed
            db.commit()
    finally:
        db.close()


# ── Routes ──

@router.post("/upload", response_model=BulkUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def bulk_upload(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    job_description_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload up to 50 PDF/DOCX files for batch processing."""
    if len(files) > MAX_BULK_FILES:
        raise HTTPException(status_code=400, detail=f"Max {MAX_BULK_FILES} files allowed.")
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    file_infos: List[dict] = []
    upload_dir = Path(settings.UPLOAD_DIR) / current_user.id
    upload_dir.mkdir(parents=True, exist_ok=True)

    for f in files:
        ext = Path(f.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTS:
            raise HTTPException(status_code=400, detail=f"File '{f.filename}' must be PDF or DOCX.")
        content = await f.read()
        if len(content) > MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail=f"File '{f.filename}' exceeds 5 MB limit.")
        unique = f"{uuid.uuid4()}{ext}"
        dest = upload_dir / unique
        dest.write_bytes(content)
        file_url = str(dest).replace("\\", "/")

        resume = Resume(
            user_id=current_user.id, file_name=f.filename or unique,
            file_url=file_url, file_size=len(content), status="pending",
        )
        db.add(resume)
        db.flush()
        file_infos.append({"resume_id": resume.id, "file_url": file_url, "file_name": f.filename or unique})

    task_id = str(uuid.uuid4())
    bulk = BulkJob(
        job_id=task_id, recruiter_id=current_user.id,
        status=BulkJobStatus.pending, total_resumes=len(files),
    )
    db.add(bulk)
    db.commit()

    background_tasks.add_task(_process_bulk, bulk.id, file_infos)
    return BulkUploadResponse(bulk_job_id=bulk.id, total_files=len(files), status="pending")


@router.get("/{bulk_job_id}/status", response_model=BulkStatusResponse)
def bulk_status(
    bulk_job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Check progress of a bulk processing job."""
    bulk = db.query(BulkJob).filter(BulkJob.id == bulk_job_id).first()
    if not bulk:
        raise HTTPException(status_code=404, detail="Bulk job not found.")
    if bulk.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    total = bulk.total_resumes or 1
    pct = round((bulk.processed_count / total) * 100, 1)
    return BulkStatusResponse(
        status=bulk.status.value if hasattr(bulk.status, "value") else str(bulk.status),
        total_resumes=bulk.total_resumes,
        processed_count=bulk.processed_count,
        progress_percent=pct,
        results=bulk.results if bulk.status == BulkJobStatus.completed else None,
    )
