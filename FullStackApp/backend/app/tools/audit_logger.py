"""
app/tools/audit_logger.py — Audit trail writer for the security pipeline.

PURPOSE:
  Every step of the security pipeline (scan → redact → score → llm_call) calls
  this tool to record what happened. This creates an immutable audit trail that
  lets admins verify the pipeline ran correctly and that no PII leaked to LLMs.

DESIGN (TOOL, NOT AGENT):
  This function is purely deterministic — it writes one DB row, no LLM calls.

CRITICAL PRIVACY RULE:
  The `detail` parameter MUST contain ONLY counts, categories, and status info.
  It MUST NEVER contain raw PII values (email addresses, phone numbers, names, etc.).
  CORRECT:   "2 emails, 1 phone redacted (total 3 PII items)"
  INCORRECT: "Redacted: john.doe@example.com, +91-9876543210"

  This rule is enforced by convention (code review, this comment) not by a DB
  constraint. Every caller is responsible for building a PII-free detail string.

FUTURE WORK:
  TODO: Encrypt the `detail` column at rest using AES/Fernet
  (from the `cryptography` package) to protect even count/category metadata
  from DB-level breaches. Deferred to keep dependencies light for hackathon.
"""

import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


def log_step(
    db_session,
    step_name: str,
    status: str,
    detail: str,
    resume_id: Optional[str] = None,
) -> None:
    """
    Write one audit row for a single pipeline step.

    This is called after EVERY step in both the deterministic pre-pipeline
    and the agent reasoning phase. It runs regardless of whether a step
    passed or failed, giving a complete audit trail.

    Args:
        db_session: An active SQLAlchemy Session (from get_db() or SessionLocal()).
                    Pass None to skip DB write (e.g., during CLI usage without DB).
        step_name:  Which step ran. Convention: 'scan' | 'redact' | 'score' | 'llm_call'.
        status:     Outcome. Convention: 'passed' | 'failed' | 'skipped' | 'error'.
        detail:     PII-FREE summary string. COUNTS AND CATEGORIES ONLY.
                    Example: "detected_type=application/pdf; passed allowlist check"
                    Example: "2 emails, 1 phone redacted (total 3 PII items)"
        resume_id:  FK to resumes.id. Pass None for CLI/standalone runs.

    Returns:
        None — fire-and-forget. Errors are logged but not re-raised (the pipeline
        must not fail because of a logging error).
    """
    if db_session is None:
        # CLI or unit-test mode — just log to console, no DB needed.
        logger.info(
            "[audit_log] STEP=%s STATUS=%s RESUME=%s DETAIL=%s",
            step_name, status, resume_id or "N/A", detail,
        )
        return

    try:
        # Import here to avoid circular imports — models import base which imports
        # session which is set up before models are fully loaded.
        from app.models.audit_log import AuditLog

        entry = AuditLog(
            timestamp=datetime.utcnow(),
            step_name=step_name,
            status=status,
            detail=detail,
            resume_id=resume_id,
        )
        db_session.add(entry)
        db_session.commit()
        logger.info(
            "[audit_log] Wrote step='%s' status='%s' resume_id=%s",
            step_name, status, resume_id or "N/A",
        )
    except Exception as exc:
        # Log the error but do NOT re-raise — a logging failure must not
        # abort the user's resume processing request.
        logger.error(
            "[audit_log] Failed to write audit row (step=%s): %s",
            step_name, exc,
        )
        try:
            db_session.rollback()
        except Exception:
            pass


def build_scan_detail(scan_result: dict) -> str:
    """
    Build a PII-free detail string from a scan_file() result dict.

    Safe to write directly to the audit_log.detail column.
    """
    detected = scan_result.get("detected_type", "unknown")
    passed = scan_result.get("passed", False)
    reason = scan_result.get("reason") or "none"
    return (
        f"detected_type={detected}; "
        f"passed={passed}; "
        f"reason={reason}"
    )


def build_redact_detail(redact_result: dict) -> str:
    """
    Build a PII-free detail string from a redact_pii() result dict.

    Includes counts and type names only — NEVER the actual redacted values.
    Safe to write directly to the audit_log.detail column.
    """
    count = redact_result.get("redaction_count", 0)
    types = redact_result.get("types_found", [])
    types_str = ", ".join(types) if types else "none"
    return f"{count} PII item(s) redacted; types found: {types_str}"
