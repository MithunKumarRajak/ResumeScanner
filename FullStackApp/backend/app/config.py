"""
Application configuration — reads from .env file.
Switch DB from SQLite → PostgreSQL by changing DATABASE_URL in .env.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────
    APP_NAME: str = "Resume Screener API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True

    # ── Database ──────────────────────────────────────────
    # SQLite default — change to postgresql://user:pass@host/dbname for Postgres
    DATABASE_URL: str = "sqlite:///./resume_screener.db"

    # ── JWT Auth ──────────────────────────────────────────
    SECRET_KEY: str = "change-this-secret-key-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── File Upload ───────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_CONTENT_TYPES: List[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    # ── ML Model Paths ────────────────────────────────────
    # Resolved relative to working directory (backend/)
    MODEL_PATH: str = "../model.pkl"
    TFIDF_PATH: str = "../tfidf.pkl"
    ENCODER_PATH: str = "../encoder.pkl"

    # ── CORS ──────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
