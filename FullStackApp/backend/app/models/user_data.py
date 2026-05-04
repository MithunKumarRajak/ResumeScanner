import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint
from app.database.base import Base


class UserData(Base):
    """
    General-purpose key-value store for user data.
    Replaces the legacy SQLite user_data table.
    data_type examples: 'parsed_resume', 'resume_build', 'job_description'
    """
    __tablename__ = "user_data"

    id        = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id   = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    data_type = Column(String(100), nullable=False)
    data_json = Column(Text,        nullable=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "data_type", name="uq_user_data_type"),
    )
