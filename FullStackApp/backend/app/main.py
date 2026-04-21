"""
FastAPI application factory.
Runs on port 8001 — the original main.py remains on port 8000.

Start: uvicorn app.main:app --reload --port 8001
Docs:  http://localhost:8001/docs
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database.base    import Base
from app.database.session import engine

# ── Import all models so SQLAlchemy sees them ─────────────
import app.models  # noqa: F401  (triggers __init__.py)

# ── Routes ────────────────────────────────────────────────
from app.routes import auth, resume, job, match, recommend, dashboard, candidate, analytics

logging.basicConfig(
    level   = logging.INFO if settings.DEBUG else logging.WARNING,
    format  = "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt = "%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ─────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────
    logger.info("🚀 Starting Resume Screener API v2")

    # Create all DB tables (idempotent — does nothing if they exist)
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables ready")

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"📁 Upload directory: {settings.UPLOAD_DIR}")

    # Pre-load ML models
    from app.services.classifier import load_models
    ok = load_models()
    if ok:
        logger.info("🤖 ML models loaded")
    else:
        logger.warning("⚠️  ML models could not be loaded — /match and /classify will return 503")

    yield

    # ── Shutdown ──────────────────────────────────────────
    logger.info("👋 Shutting down")


# ── App factory ───────────────────────────────────────────

app = FastAPI(
    title       = settings.APP_NAME,
    version     = settings.APP_VERSION,
    description = """
## Resume Screening & Job Matching API

Production-ready backend with:

* 📄 **Resume Upload & Parsing** — PDF/DOCX extraction + spaCy NER
* 🏷️ **ML Classification** — trained SVM/RF model predicts job category
* 🔗 **Job Matching** — TF-IDF cosine similarity score with skill breakdown
* 🏆 **Candidate Ranking** — sorted leaderboard per job
* 💡 **Job Recommendations** — personalised suggestions for candidates
* 🔐 **JWT Auth** — register, login, protected endpoints

**Docs:** `/docs` (Swagger) | `/redoc` (ReDoc)
    """,
    lifespan    = lifespan,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

# ── CORS ──────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Serve uploaded files as static ────────────────────────
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── Register routers ──────────────────────────────────────
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(job.router)
app.include_router(match.router)
app.include_router(recommend.router)
app.include_router(dashboard.router)
app.include_router(candidate.router)
app.include_router(analytics.router)

# ── Global exception handler ──────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
        content     = {"detail": "An internal server error occurred."},
    )

# ── Health & root ─────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    """Liveness check — returns 200 when the server is running."""
    return {
        "status":  "ok",
        "version": settings.APP_VERSION,
        "db":      settings.DATABASE_URL.split("///")[0],
    }


@app.get("/", tags=["System"])
def root():
    return {
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs":    "/docs",
        "health":  "/health",
        "endpoints": {
            "auth":        ["POST /auth/register", "POST /auth/token", "GET /auth/me"],
            "resumes":     ["POST /upload-resume", "GET /resumes", "GET /resume/{id}", "PUT /resume/{id}"],
            "jobs":        ["POST /jobs", "GET /jobs", "GET /jobs/{id}", "PUT /jobs/{id}"],
            "matching":    ["POST /match", "GET /rank-candidates/{job_id}", "GET /matches/{resume_id}"],
            "recommend":   ["GET /recommend/{user_id}"],
            "dashboard":   ["GET /dashboard/summary", "GET /dashboard/candidates", "GET /dashboard/job/{id}/overview"],
            "candidate":   ["GET /candidate/resume-history", "GET /candidate/recommendations"],
            "analytics":   ["GET /analytics/skill-demand", "GET /analytics/skill-supply",
                            "GET /analytics/match-distribution", "GET /analytics/category-breakdown",
                            "GET /analytics/experience-distribution", "GET /analytics/top-candidates"],
            "categories":  ["GET /categories"],
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
