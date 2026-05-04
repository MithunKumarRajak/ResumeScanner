import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database.base import Base


class NotificationType(str, enum.Enum):
    shortlisted      = "shortlisted"
    rejected         = "rejected"
    on_hold          = "on_hold"
    interview_invite = "interview_invite"


class NotificationStatus(str, enum.Enum):
    pending = "pending"
    sent    = "sent"
    failed  = "failed"


class EmailNotification(Base):
    """
    Tracks outbound email notifications to candidates.
    Optionally linked to a ResumeAnalysis for context.
    """
    __tablename__ = "email_notifications"

    id                 = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_email    = Column(String(255), nullable=False, index=True)
    notification_type  = Column(SAEnum(NotificationType), nullable=False)
    subject            = Column(String(500), nullable=False)
    body               = Column(Text,        nullable=False)
    sent_at            = Column(DateTime,    nullable=True)
    status             = Column(SAEnum(NotificationStatus), default=NotificationStatus.pending, nullable=False)
    resume_analysis_id = Column(String(36), ForeignKey("resume_analyses.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    resume_analysis = relationship("ResumeAnalysis", backref="notifications")
