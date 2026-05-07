"""
POST /api/ats/check  — Run ATS compatibility checks on a resume.

Performs seven heuristic checks against the raw text of a parsed resume,
calculates an ATS score, persists results to ResumeAnalysis, and returns
the score + issue list.
"""
import re
import logging
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.resume    import Resume
from app.models.analysis  import ResumeAnalysis
from app.utils.auth       import get_current_active_user
from app.models.user      import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ats", tags=["ATS Checker"])


#  Schemas ─

class ATSCheckRequest(BaseModel):
    resume_id: str


class ATSIssue(BaseModel):
    issue: str
    severity: str          # high | medium | low
    suggestion: str


class ATSCheckResponse(BaseModel):
    ats_score: float
    issues: List[ATSIssue]
    passed: bool           # score >= 70


#  Route ─

from app.services.ats_checker import ats_checker_service

@router.post("/check", response_model=ATSCheckResponse)
def ats_check(
    payload:      ATSCheckRequest,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """
    Run ATS-compatibility checks on a resume's raw text.

    Returns an **ats_score** (0-100), a list of **issues** with severity and
    suggested fixes, and a boolean **passed** flag (score ≥ 70).
    """
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if not resume.raw_text:
        raise HTTPException(
            status_code=400,
            detail="Resume has not been parsed yet. Wait for parsing to finish.",
        )

    # Run all checks via service
    result = ats_checker_service.check(resume.raw_text)
    ats_score = result["ats_score"]
    all_issues = result["issues"]

    #  Persist to ResumeAnalysis 
    analysis = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.resume_id == resume.id)
        .order_by(ResumeAnalysis.created_at.desc())
        .first()
    )
    if analysis:
        analysis.ats_score  = ats_score
        analysis.ats_issues = all_issues
    else:
        analysis = ResumeAnalysis(
            resume_id          = resume.id,
            overall_score      = ats_score,
            keyword_match_score = 0,
            skills_match_score  = 0,
            experience_score    = 0,
            ats_score           = ats_score,
            matched_keywords    = [],
            missing_keywords    = [],
            ats_issues          = all_issues,
        )
        db.add(analysis)

    db.commit()

    logger.info(f"ATS check for resume {resume.id}: score={ats_score}, issues={len(all_issues)}")

    return ATSCheckResponse(
        ats_score=ats_score,
        issues=[ATSIssue(**iss) for iss in all_issues],
        passed=result["passed"],
    )
