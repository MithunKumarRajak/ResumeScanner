"""
app/routes/status.py — System health and audit trail inspection endpoints.

Endpoints:
  GET /api/status      — Frontend health badge + DB status
  GET /api/audit-log   — Tail recent audit_log rows (judges / demo use)
  GET /status          — Alias for /api/status (backwards-compat with README curl examples)
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db

router = APIRouter(prefix="/api", tags=["System"])


@router.get("/status")
def api_status(request: Request):
    """Frontend-friendly status endpoint for health badges and diagnostics."""
    db_available = bool(getattr(request.app.state, "db_available", False))
    return {
        "status": "online",
        "api": "ok",
        "version": settings.APP_VERSION,
        "database": "ok" if db_available else "degraded",
        "models": "lazy-loaded",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/audit-log")
def get_audit_log(
    request: Request,
    limit: int = Query(default=20, ge=1, le=200, description="Max rows to return (1–200)"),
    resume_id: Optional[str] = Query(default=None, description="Filter by resume_id"),
    step_name: Optional[str] = Query(default=None, description="Filter by step name (scan/redact/score/llm_call/feedback)"),
    db: Session = Depends(get_db),
):
    """
    Return the most recent audit_log rows from the security pipeline.

    Use this to verify that the agentic pipeline ran correctly:
      - Every upload should produce rows for 'scan', 'redact', 'llm_call', 'score'.
      - The 'detail' column contains ONLY counts/categories — never raw PII.

    Query params:
      limit     — number of rows (default 20, max 200)
      resume_id — filter to a specific resume
      step_name — filter to a specific step

    Example:
      GET /api/audit-log?limit=10
      GET /api/audit-log?resume_id=abc123&step_name=redact
    """
    try:
        from app.models.audit_log import AuditLog
        query = db.query(AuditLog).order_by(AuditLog.id.desc())
        if resume_id:
            query = query.filter(AuditLog.resume_id == resume_id)
        if step_name:
            query = query.filter(AuditLog.step_name == step_name)
        rows = query.limit(limit).all()
        return {
            "count": len(rows),
            "rows": [
                {
                    "id":        row.id,
                    "timestamp": row.timestamp.isoformat() + "Z" if row.timestamp else None,
                    "step_name": row.step_name,
                    "status":    row.status,
                    "detail":    row.detail,
                    "resume_id": row.resume_id,
                }
                for row in rows
            ],
        }
    except Exception as exc:
        return {"error": str(exc), "rows": [], "count": 0}
