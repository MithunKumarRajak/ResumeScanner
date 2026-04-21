import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class Match(Base):
    __tablename__ = "matches"

    id        = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resume_id = Column(String(36), ForeignKey("resumes.id"), nullable=False, index=True)
    job_id    = Column(String(36), ForeignKey("jobs.id"),    nullable=False, index=True)

    # ── TF-IDF cosine similarity ─────────────────────────
    match_score     = Column(Float, nullable=False, index=True)
    matched_skills  = Column(JSON,  default=list)   # list[str]
    missing_skills  = Column(JSON,  default=list)   # list[str]
    resume_top_terms = Column(JSON, default=list)   # list[str]
    jd_top_terms    = Column(JSON,  default=list)   # list[str]

    # ── Composite score breakdown (from scorer) ──────────
    skill_score      = Column(Float, nullable=True)
    experience_score = Column(Float, nullable=True)
    education_score  = Column(Float, nullable=True)
    category_score   = Column(Float, nullable=True)
    total_score      = Column(Float, nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    resume = relationship("Resume", back_populates="matches")
    job    = relationship("Job",    back_populates="matches")

