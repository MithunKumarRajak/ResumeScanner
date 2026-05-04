import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.base import Base


class BulkJobStatus(str, enum.Enum):
    pending    = "pending"
    processing = "processing"
    completed  = "completed"
    failed     = "failed"


class BulkJob(Base):
    """
    Tracks a batch resume-processing job dispatched via Celery.
    Stores progress counters and aggregate results.
    """
    __tablename__ = "bulk_jobs"

    id           = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id       = Column(String(255), unique=True, nullable=False, index=True)  # Celery task id
    recruiter_id = Column(String(36),  ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    status          = Column(SAEnum(BulkJobStatus), default=BulkJobStatus.pending, nullable=False)
    total_resumes   = Column(Integer, nullable=False)
    processed_count = Column(Integer, default=0)
    results         = Column(JSONB,   nullable=True)

    created_at   = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    recruiter = relationship("User", backref="bulk_jobs")
