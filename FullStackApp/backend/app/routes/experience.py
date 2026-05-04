"""
POST /api/experience/extract  — Extract work history, experience, and career gaps.
"""
import re, logging
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.resume import Resume
from app.models.candidate import CandidateProfile
from app.models.user import User
from app.utils.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/experience", tags=["Experience Extraction"])

class ExperienceRequest(BaseModel):
    resume_id: str

class WorkHistoryEntry(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False

class CareerGap(BaseModel):
    gap_start: str
    gap_end: str
    gap_days: int

class ExperienceResponse(BaseModel):
    work_history: List[WorkHistoryEntry]
    total_years: float
    career_gaps: List[CareerGap]

from app.services.experience_extractor import experience_extractor_service

@router.post("/extract", response_model=ExperienceResponse)
def extract_experience(
    payload: ExperienceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Extract work history, total experience years, and career gaps from resume text."""
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if not resume.raw_text:
        raise HTTPException(status_code=400, detail="Resume not parsed yet.")

    result = experience_extractor_service.extract(resume.raw_text)
    
    wh = result["work_history"]
    total = result["total_experience_years"]
    career_gaps = result["career_gaps"]

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if profile:
        profile.work_history = wh
        profile.total_experience_years = total
        profile.career_gaps = career_gaps or None
    else:
        profile = CandidateProfile(
            user_id=current_user.id,
            full_name=resume.parsed_name or current_user.full_name or "",
            email=current_user.email,
            total_experience_years=total, work_history=wh,
            career_gaps=career_gaps or None,
        )
        db.add(profile)
    db.commit()
    logger.info(f"Experience: resume={resume.id}, positions={len(wh)}, yrs={total}, gaps={len(career_gaps)}")

    return ExperienceResponse(
        work_history=[WorkHistoryEntry(**w) for w in wh],
        total_years=total,
        career_gaps=[CareerGap(**g) for g in career_gaps],
    )
