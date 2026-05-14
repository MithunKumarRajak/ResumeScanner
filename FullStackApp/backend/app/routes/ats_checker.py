"""
POST /api/ats/check - Run ATS compatibility checks on a resume.

Accepts either a saved backend resume_id or direct resume_text. When a saved
resume exists, results are persisted to ResumeAnalysis. Direct text checks are
stateless so the checker still works when upload persistence or background
parsing has not completed yet.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.analysis import ResumeAnalysis
from app.models.resume import Resume
from app.models.user import User
from app.services.ats_checker import ats_checker_service
from app.utils.auth import get_optional_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ats", tags=["ATS Checker"])


class ATSCheckRequest(BaseModel):
    resume_id: Optional[str] = None
    resume_text: Optional[str] = None


class ATSIssue(BaseModel):
    issue: str
    severity: str
    suggestion: str


class ATSCheckResponse(BaseModel):
    ats_score: float
    issues: List[ATSIssue]
    passed: bool


@router.post("/check", response_model=ATSCheckResponse)
def ats_check(
    payload: ATSCheckRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Run ATS-compatibility checks using a saved resume when available, otherwise
    fall back to the resume text already extracted in the frontend.
    """
    resume = None
    fallback_text = (payload.resume_text or "").strip()
    resume_text = fallback_text

    if payload.resume_id:
        resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
        if resume:
            resume_text = (resume.raw_text or "").strip() or fallback_text
        elif not fallback_text:
            raise HTTPException(status_code=404, detail="Resume not found.")

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="Provide resume_text or a resume_id for a parsed resume.",
        )

    result = ats_checker_service.check(resume_text)
    ats_score = result["ats_score"]
    all_issues = result["issues"]

    if resume:
        analysis = (
            db.query(ResumeAnalysis)
            .filter(ResumeAnalysis.resume_id == resume.id)
            .order_by(ResumeAnalysis.created_at.desc())
            .first()
        )
        if analysis:
            analysis.ats_score = ats_score
            analysis.ats_issues = all_issues
        else:
            analysis = ResumeAnalysis(
                resume_id=resume.id,
                overall_score=ats_score,
                keyword_match_score=0,
                skills_match_score=0,
                experience_score=0,
                ats_score=ats_score,
                matched_keywords=[],
                missing_keywords=[],
                ats_issues=all_issues,
            )
            db.add(analysis)
        db.commit()

    resume_ref = resume.id if resume else "direct-text"
    user_ref = current_user.id if current_user else "guest"
    logger.info(
        "ATS check for resume %s by %s: score=%s, issues=%s",
        resume_ref,
        user_ref,
        ats_score,
        len(all_issues),
    )

    return ATSCheckResponse(
        ats_score=ats_score,
        issues=[ATSIssue(**issue) for issue in all_issues],
        passed=result["passed"],
    )
