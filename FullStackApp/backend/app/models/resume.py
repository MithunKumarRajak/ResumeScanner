import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class Resume(Base):
    __tablename__ = "resumes"

    id      = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # ── File info ─────────────────────────────────────────
    file_name = Column(String(255), nullable=True)
    file_url  = Column(String(500), nullable=True)
    file_size = Column(Integer,     nullable=True)    # bytes

    # ── Raw content ───────────────────────────────────────
    raw_text = Column(Text, nullable=True)

    # ── NLP-parsed fields ─────────────────────────────────
    parsed_name      = Column(String(255), nullable=True)
    parsed_education = Column(Text,        nullable=True)
    experience_years = Column(Integer,     default=0)
    preferred_role   = Column(String(255), nullable=True)

    # ── ML classification ─────────────────────────────────
    predicted_category = Column(String(255), nullable=True)
    confidence_score   = Column(Float,       nullable=True)

    # ── Status ────────────────────────────────────────────
    # pending | parsed | classified | error
    status        = Column(String(50), default="pending")
    error_message = Column(Text,       nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user    = relationship("User",         back_populates="resumes")
    skills  = relationship("ResumeSkill",  back_populates="resume", cascade="all, delete-orphan")
    matches = relationship("Match",        back_populates="resume", cascade="all, delete-orphan")
