import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.base import Base


class ResumeAnalysis(Base):
    """
    Detailed scoring breakdown of a resume, optionally against a job description.
    Captures keyword matching, skills alignment, ATS compatibility, and
    AI-generated (Gemini / Groq) optimization tips.
    """
    __tablename__ = "resume_analyses"

    id                 = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resume_id          = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    job_description_id = Column(String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)

    # ── Score breakdown (0-100) ────────────────────────────────
    overall_score       = Column(Float, nullable=False)
    keyword_match_score = Column(Float, nullable=False)
    skills_match_score  = Column(Float, nullable=False)
    experience_score    = Column(Float, nullable=False)
    ats_score           = Column(Float, nullable=True)

    # ── JSONB structured data ──────────────────────────────────
    matched_keywords  = Column(JSONB, default=list)    # ["python", "aws", ...]
    missing_keywords  = Column(JSONB, default=list)    # ["kubernetes", ...]
    ats_issues        = Column(JSONB, nullable=True)   # [{issue, severity, suggestion}, ...]
    optimization_tips = Column(JSONB, nullable=True)   # ["Tip 1", "Tip 2", ...]  (from Gemini/Groq)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    resume          = relationship("Resume",  backref="analyses")
    job_description = relationship("Job",     backref="resume_analyses")
