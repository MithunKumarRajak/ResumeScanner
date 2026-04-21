from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


# ── Register / Login ──────────────────────────────────────
class UserCreate(BaseModel):
    email:     EmailStr
    password:  str
    full_name: Optional[str] = None
    role:      UserRole = UserRole.candidate

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


# ── Response ──────────────────────────────────────────────
class UserOut(BaseModel):
    id:         str
    email:      str
    full_name:  Optional[str]
    role:       UserRole
    is_active:  bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── JWT Token ─────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserOut


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email:   Optional[str] = None
