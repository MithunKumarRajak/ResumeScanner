"""
FastAPI application factory.
Unified backend — all routes (auth, AI, resume, jobs, etc.) in one app.

Start: uvicorn app.main:app --reload --port 8000
Docs:  http://localhost:8000/docs
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database.base import Base
from app.database.session import engine

#  Import all models so SQLAlchemy sees them ─
import app.models  # noqa: F401  (triggers __init__.py)

#  Routes
from app.routes import auth, resume, job, match, recommend, dashboard, candidate, analytics, ai, predict
from app.routes import ats_checker, experience, compare, bulk, notifications, advanced

logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


#  Lifespan (startup / shutdown) ─

@asynccontextmanager
async def lifespan(app: FastAPI):
    #  Startup ─
    logger.info("🚀 Starting Resume Screener API v2")

    # Create all DB tables (idempotent — does nothing if they exist)
    Base.metadata.create_all(bind=engine)
    logger.info(" Database tables ready")

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f" Upload directory: {settings.UPLOAD_DIR}")

    # Pre-load ML models (classifier service — used by /match and /classify)
    from app.services.classifier import load_models
    ok = load_models()
    if ok:
        logger.info(" ML models loaded (classifier service)")
    else:
        logger.warning(
            "⚠️  ML models could not be loaded — /match and /classify will return 503")

    # ML Models are lazily loaded inside predict.py to save RAM
    logger.info(" ML models configured for lazy loading")

    yield

    #  Shutdown
    logger.info("👋 Shutting down")


#  App factory ─

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
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
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

#  CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Register routers ─
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(job.router)
app.include_router(match.router)
app.include_router(recommend.router)
app.include_router(dashboard.router)
app.include_router(candidate.router)
app.include_router(analytics.router)
app.include_router(ai.router)
app.include_router(predict.router)

#  Phase-2 routers
app.include_router(ats_checker.router)
app.include_router(experience.router)
app.include_router(compare.router)
app.include_router(bulk.router)
app.include_router(notifications.router)

#  Advanced routers
app.include_router(advanced.router)

#  Global exception handler ─


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."},
    )

#  Health & root ─


@app.get("/health", tags=["System"])
def health():
    """Liveness check — returns 200 when the server is running."""
    return {
        "status":  "ok",
        "version": settings.APP_VERSION,
        "db":      "postgresql",
    }


@app.get("/", tags=["System"])
def root():
    return {
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs":    "/docs",
        "health":  "/health",
        "endpoints": {
            "auth":        ["POST /auth/signup", "POST /auth/login", "GET /auth/me",
                            "PUT /auth/profile", "PUT /auth/change-password",
                            "DELETE /auth/delete-account"],
            "predict":     ["POST /predict", "GET /models"],
            "resumes":     ["POST /upload-resume", "GET /resumes", "GET /resume/{id}", "PUT /resume/{id}"],
            "jobs":        ["POST /jobs", "GET /jobs", "GET /jobs/{id}", "PUT /jobs/{id}"],
            "matching":    ["POST /match", "GET /rank-candidates/{job_id}", "GET /matches/{resume_id}"],
            "recommend":   ["GET /recommend/{user_id}"],
            "dashboard":   ["GET /dashboard/summary", "GET /dashboard/candidates", "GET /dashboard/job/{id}/overview"],
            "candidate":   ["GET /candidate/resume-history", "GET /candidate/recommendations"],
            "ai":          ["POST /ai/generate-jd", "POST /ai/refine-jd", "POST /extract-resume"],
            "user_data":   ["POST /user/data", "GET /user/data/{type}", "GET /user/data"],
            "analytics":   ["GET /analytics/skill-demand", "GET /analytics/skill-supply",
                            "GET /analytics/match-distribution", "GET /analytics/category-breakdown",
                            "GET /analytics/experience-distribution", "GET /analytics/top-candidates"],
            "categories":  ["GET /categories"],
            "ats":         ["POST /api/ats/check"],
            "experience":  ["POST /api/experience/extract"],
            "compare":     ["POST /api/compare/candidates"],
            "bulk":        ["POST /api/bulk/upload", "GET /api/bulk/{id}/status"],
            "notifications": ["POST /api/notifications/send"],
            "advanced":      ["POST /api/v1/advanced/match", "POST /api/v1/advanced/explain", "POST /api/v1/advanced/bias-check", "POST /api/v1/advanced/detect-language", "POST /api/v1/advanced/fine-tune", "GET /api/v1/advanced/fine-tune/status/{id}", "GET /api/v1/advanced/bias-report"],
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
