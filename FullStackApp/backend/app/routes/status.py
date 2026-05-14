from datetime import datetime

from fastapi import APIRouter, Request

from app.config import settings

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
