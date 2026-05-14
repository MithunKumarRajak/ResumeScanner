"""
Application configuration — reads from .env file.
Database: PostgreSQL (configured via DATABASE_URL in .env).
"""
import os
import secrets
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    #  App ─
    APP_NAME: str = "Resume Screener API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    #  Database (PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resume_screener.db")

    #  JWT Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "") or secrets.token_urlsafe(64)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    #  File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_CONTENT_TYPES: List[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    #  ML Model Paths ─
    # Resolved relative to the repository root unless an absolute path is supplied.
    MODEL_DIR: str = "FullStackApp/v6"
    MODEL_PATH: str = "../model.pkl"
    TFIDF_PATH: str = "../tfidf.pkl"
    ENCODER_PATH: str = "../encoder.pkl"

    #  Email / Notifications
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@resumescanner.app"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    #  CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
    LOCAL_CORS_ORIGIN_REGEX: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    model_config = {"env_file": ".env",
                    "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "dev", "development"}:
                return True
            if normalized in {"", "0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return value


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
