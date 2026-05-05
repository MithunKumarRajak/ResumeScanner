"""
Application configuration — reads from .env file.
Database: PostgreSQL (configured via DATABASE_URL in .env).
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os


class Settings(BaseSettings):
    # ── App ───
    APP_NAME: str = "Resume Screener API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True

    # ── Database (PostgreSQL) ──
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/resume_screener"

    # ── JWT Auth ──
    SECRET_KEY: str = "change-this-secret-key-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── File Upload ──
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_CONTENT_TYPES: List[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    # ── ML Model Paths ───────
    # Resolved relative to the repository root unless an absolute path is supplied.
    MODEL_DIR: str = "models/v6"
    MODEL_PATH: str = "../model.pkl"
    TFIDF_PATH: str = "../tfidf.pkl"
    ENCODER_PATH: str = "../encoder.pkl"

    # ── Email / Notifications ──
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@resumescanner.app"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""

    # ── CORS ──
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

    model_config = {"env_file": ".env",
                    "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
