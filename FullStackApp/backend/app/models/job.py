import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # ── Core fields ───────────────────────────────────────
    title         = Column(String(255), nullable=False, index=True)
    description   = Column(Text,        nullable=False)
    role_category = Column(String(255), nullable=True)
    location      = Column(String(255), nullable=True)

    # ── Experience range ──────────────────────────────────
    experience_min = Column(Integer, default=0)
    experience_max = Column(Integer, default=10)

    is_active = Column(Boolean,  default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by_user = relationship("User",     back_populates="jobs")
    skills          = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    matches         = relationship("Match",    back_populates="job", cascade="all, delete-orphan")
