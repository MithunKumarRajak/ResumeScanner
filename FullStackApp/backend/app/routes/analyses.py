from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.analysis_report import AnalysisReport
from app.models.user import User
from app.utils.auth import get_optional_current_user

router = APIRouter(prefix="/api/analyses", tags=["Analysis Reports"])


class AnalysisReportCreate(BaseModel):
    model_config = {"protected_namespaces": ()}

    resume_id: Optional[str] = None
    title: str = Field(default="Resume analysis", max_length=255)
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    predicted_category: Optional[str] = None
    model_version: Optional[str] = None
    match_score: Optional[float] = None
    ats_score: Optional[float] = None
    status: str = "saved"
    summary: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class AnalysisReportOut(AnalysisReportCreate):
    id: str
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "protected_namespaces": ()}


@router.post("", response_model=AnalysisReportOut, status_code=status.HTTP_201_CREATED)
def save_analysis_report(
    payload: AnalysisReportCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    report = AnalysisReport(
        user_id=current_user.id if current_user else None,
        resume_id=payload.resume_id,
        title=payload.title or "Resume analysis",
        candidate_name=payload.candidate_name,
        job_title=payload.job_title,
        predicted_category=payload.predicted_category,
        model_version=payload.model_version,
        match_score=payload.match_score,
        ats_score=payload.ats_score,
        status=payload.status,
        summary=payload.summary,
        payload=payload.payload,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=List[AnalysisReportOut])
def list_analysis_reports(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if not current_user:
        query = db.query(AnalysisReport).filter(AnalysisReport.user_id.is_(None))
    else:
        user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        query = db.query(AnalysisReport)
        if user_role not in {"recruiter", "admin"}:
            query = query.filter(AnalysisReport.user_id == current_user.id)
    return query.order_by(AnalysisReport.created_at.desc()).limit(50).all()


@router.get("/{report_id}", response_model=AnalysisReportOut)
def get_analysis_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    report = db.query(AnalysisReport).filter(AnalysisReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Analysis report not found.")
    if report.user_id and (not current_user or report.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")
    return report


@router.delete("/{report_id}")
def delete_analysis_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    report = db.query(AnalysisReport).filter(AnalysisReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Analysis report not found.")
    if report.user_id and (not current_user or report.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")
    db.delete(report)
    db.commit()
    return {"ok": True}
