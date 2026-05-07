import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, Text, Boolean
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

    #  Score breakdown (0-100) 
    overall_score       = Column(Float, nullable=False)
    keyword_match_score = Column(Float, nullable=False)
    skills_match_score  = Column(Float, nullable=False)
    experience_score    = Column(Float, nullable=False)
    ats_score           = Column(Float, nullable=True)

    #  JSONB structured data 
    matched_keywords  = Column(JSONB, default=list)    # ["python", "aws", ...]
    missing_keywords  = Column(JSONB, default=list)    # ["kubernetes", ...]
    ats_issues        = Column(JSONB, nullable=True)   # [{issue, severity, suggestion}, ...]
    optimization_tips = Column(JSONB, nullable=True)   # ["Tip 1", "Tip 2", ...]  (from Gemini/Groq)

    #  Advanced: Semantic, XAI & Bias 
    job_description_text  = Column(Text, nullable=True)
    semantic_score        = Column(Float, nullable=True)           # 0–100
    keyword_overlap_score = Column(Float, nullable=True)   # 0–100
    combined_score        = Column(Float, nullable=True)          # weighted
    semantic_model_used   = Column(String(100), nullable=True)
    
    predicted_category    = Column(String(100), nullable=True)
    prediction_confidence = Column(Float, nullable=True)   # 0.0–1.0
    model_version         = Column(String(20), default='v6')
    
    explanation           = Column(JSONB, nullable=True)              # full SHAP output dict
    explanation_summary   = Column(Text, nullable=True)      # human-readable string
    
    detected_language     = Column(String(10), nullable=True)  # 'en' or 'hi'
    bias_flags            = Column(JSONB, nullable=True)               # list of flag strings
    gender_indicators     = Column(JSONB, nullable=True)
    age_indicators        = Column(JSONB, nullable=True)
    
    analysis_duration_ms  = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    resume          = relationship("Resume",  backref="analyses")
    job_description = relationship("Job",     backref="resume_analyses")
