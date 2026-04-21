import enum
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database.base import Base


class SkillSource(str, enum.Enum):
    parsed = "parsed"
    manual = "manual"


class Skill(Base):
    """Normalised skill lookup table — each skill stored once."""
    __tablename__ = "skills"

    id       = Column(Integer,     primary_key=True, autoincrement=True)
    name     = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=True)   # e.g. "programming", "framework"

    resume_skills = relationship("ResumeSkill", back_populates="skill")
    job_skills    = relationship("JobSkill",    back_populates="skill")


class ResumeSkill(Base):
    """Many-to-many join: resumes ↔ skills."""
    __tablename__ = "resume_skills"

    id        = Column(Integer,          primary_key=True, autoincrement=True)
    resume_id = Column(String(36),       ForeignKey("resumes.id"), nullable=False, index=True)
    skill_id  = Column(Integer,          ForeignKey("skills.id"),  nullable=False)
    source    = Column(SAEnum(SkillSource), default=SkillSource.parsed)

    resume = relationship("Resume", back_populates="skills")
    skill  = relationship("Skill",  back_populates="resume_skills")


class JobSkill(Base):
    """Many-to-many join: jobs ↔ skills."""
    __tablename__ = "job_skills"

    id          = Column(Integer,  primary_key=True, autoincrement=True)
    job_id      = Column(String(36), ForeignKey("jobs.id"),   nullable=False, index=True)
    skill_id    = Column(Integer,    ForeignKey("skills.id"), nullable=False)
    is_required = Column(Boolean,    default=True)

    job   = relationship("Job",   back_populates="skills")
    skill = relationship("Skill", back_populates="job_skills")
