import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database.base import Base


class AnalysisReport(Base):
    """Saved frontend-facing resume analysis report."""

    __tablename__ = "analysis_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(String(255), nullable=False, default="Resume analysis")
    candidate_name = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    predicted_category = Column(String(120), nullable=True)
    model_version = Column(String(50), nullable=True)
    match_score = Column(Float, nullable=True)
    ats_score = Column(Float, nullable=True)
    status = Column(String(50), nullable=False, default="saved")
    summary = Column(Text, nullable=True)
    payload = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", backref="analysis_reports")
    resume = relationship("Resume", backref="analysis_reports")
