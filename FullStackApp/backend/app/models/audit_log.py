"""
app/models/audit_log.py — SQLAlchemy model for the security pipeline audit trail.

WHY THIS EXISTS:
  Every step of the agentic security pipeline (scan → redact → score → llm_call)
  writes one row here. This gives auditors a tamper-evident record of what happened
  to each resume without storing any raw PII in this table.

PRIVACY RULE:
  The `detail` column MUST contain only counts/categories (e.g., "2 emails, 1 phone
  redacted"). It MUST NEVER contain raw PII values. This is enforced by the
  audit_logger tool — not by a DB constraint — so every caller must respect it.

FUTURE WORK:
  TODO: Encrypt the `detail` column at rest using AES/Fernet (e.g., via the
  `cryptography` package) once compliance requirements demand it. Currently stored
  as plain text in Postgres — acceptable for a hackathon prototype but not for
  production with real candidate data.
"""

from datetime import datetime


from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.database.base import Base


class AuditLog(Base):
    """
    One row per pipeline step per resume.

    Columns:
      id         — auto-incrementing surrogate key
      timestamp  — UTC time the step completed (indexed for fast range queries)
      step_name  — which step ran: 'scan' | 'redact' | 'score' | 'llm_call'
      status     — outcome: 'passed' | 'failed' | 'skipped' | 'error'
      detail     — human-readable summary (counts/types only — NO raw PII)
      resume_id  — FK to resumes.id (nullable: CLI runs have no DB resume record)
    """

    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # UTC timestamp — indexed so queries like "all steps for resume X" are fast.
    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # Which pipeline step produced this row.
    # Allowed values: 'scan' | 'redact' | 'score' | 'llm_call'
    step_name = Column(String(50), nullable=False)

    # Outcome of the step.
    # Allowed values: 'passed' | 'failed' | 'skipped' | 'error'
    status = Column(String(20), nullable=False)

    # Human-readable summary — COUNTS AND TYPES ONLY.
    # Example: "detected_type=application/pdf; extension=.pdf; allowlist=passed"
    # Example: "2 emails, 1 phone redacted (total 3 PII items)"
    # NEVER store raw PII values here.
    detail = Column(Text, nullable=True)

    # Foreign key to the resumes table. Nullable because CLI/standalone runs
    # don't create a DB resume record.
    resume_id = Column(
        String(36),
        ForeignKey("resumes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
