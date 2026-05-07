import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.base import Base


class CandidateProfile(Base):
    """
    Rich candidate profile extracted / curated from parsed resumes.
    Stores structured skills, education, work history, and career-gap analysis.
    """
    __tablename__ = "candidate_profiles"

    id       = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id  = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    full_name = Column(String(255), nullable=False)
    email     = Column(String(255), unique=True, nullable=False, index=True)
    phone     = Column(String(50),  nullable=True)

    total_experience_years = Column(Float, nullable=True)

    #  JSONB structured data 
    skills       = Column(JSONB, default=list)    # ["Python", "SQL", ...]
    education    = Column(JSONB, default=list)    # [{degree, institution, year}, ...]
    work_history = Column(JSONB, default=list)    # [{title, company, start_date, end_date, is_current}, ...]
    career_gaps  = Column(JSONB, nullable=True)   # [{gap_start, gap_end, gap_days}, ...]

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="candidate_profile")
