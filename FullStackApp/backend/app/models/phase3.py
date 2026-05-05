import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.database.base import Base

class CustomModelConfig(Base):
    """
    Tracks company-specific fine-tuned model configurations (Feature 2).
    """
    __tablename__ = 'custom_model_configs'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = Column(String(200), nullable=False)
    model_path = Column(String(500), nullable=False)       # path to fine-tuned model dir
    training_samples = Column(Integer, nullable=True)
    accuracy = Column(Float, nullable=True)
    categories = Column(JSONB, default=list)               # list of company-specific categories
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    trained_at = Column(String(100), nullable=True)


class BiasAuditLog(Base):
    """
    Audit log for bias detection results across batches.
    """
    __tablename__ = 'bias_audit_logs'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    audit_type = Column(String(50))                        # 'single_resume' | 'batch' | 'model_audit'
    sensitive_feature = Column(String(50))                 # 'language' | 'gender' | 'age'
    demographic_parity_difference = Column(Float, nullable=True)
    equalized_odds_difference = Column(Float, nullable=True)
    bias_assessment = Column(String(20))                   # 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'
    recommendation = Column(Text, nullable=True)
    raw_report = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
