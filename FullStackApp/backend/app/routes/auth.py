"""
Auth & User-Data routes.

Endpoints (matching the frontend contract on port 8000):
  POST /auth/signup           — register (returns {user: {..., token}})
  POST /auth/login            — login   (returns {user: {..., token}})
  GET  /auth/me               — current user profile
  PUT  /auth/profile          — update name / email
  PUT  /auth/change-password  — change password
  DELETE /auth/delete-account — delete account

  POST /user/data             — upsert user data blob
  GET  /user/data/{data_type} — load one blob
  GET  /user/data             — load all blobs

Also exposes the modern JWT endpoints:
  POST /auth/register  — register (returns UserOut)
  POST /auth/token     — OAuth2 form login → JWT
"""
import json
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user      import User
from app.models.user_data import UserData
from app.schemas.user     import UserCreate, UserOut, Token
from app.schemas.user_data import UserDataCreate
from app.utils.auth       import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
)
from app.config import settings

router = APIRouter(tags=["Auth"])


# ─────────────────────────────────────────────
#  Modern JWT endpoints  (app/ architecture)
# ─────────────────────────────────────────────

@router.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """Register a new candidate or recruiter account (modern JWT flow)."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )
    user = User(
        email           = payload.email,
        hashed_password = get_password_hash(payload.password),
        full_name       = payload.full_name,
        role            = payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/token", response_model=Token)
def login_jwt(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login with email + password (OAuth2 form). Returns a JWT bearer token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled.")

    token = create_access_token(
        data={"sub": user.id, "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


# ─────────────────────────────────────────────
#  Legacy-compatible endpoints  (frontend uses these)
# ─────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional


class _SignupReq(BaseModel):
    name: str
    email: str
    password: str
    role: str = "candidate"

class _LoginReq(BaseModel):
    email: str
    password: str
    role: Optional[str] = None

class _ProfileUpdateReq(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class _PasswordChangeReq(BaseModel):
    current_password: str
    new_password: str

class _DeleteAccountReq(BaseModel):
    password: str


def _user_dict(user: User, token: str) -> dict:
    """Build the response dict the frontend expects."""
    return {
        "id":    user.id,
        "name":  user.full_name or "",
        "email": user.email,
        "role":  user.role.value if hasattr(user.role, "value") else str(user.role),
        "token": token,
    }


def _make_token(user: User) -> str:
    """Create a JWT access token for the user."""
    return create_access_token(
        data={"sub": user.id, "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


@router.post("/auth/signup")
def legacy_signup(req: _SignupReq, db: Session = Depends(get_db)):
    """Register — returns {user: {id, name, email, role, token}}."""
    if not req.name.strip() or not req.email.strip() or not req.password.strip():
        raise HTTPException(status_code=400, detail="All fields are required")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    role = req.role if req.role in ("candidate", "recruiter") else "candidate"
    user = User(
        email           = req.email.lower().strip(),
        hashed_password = get_password_hash(req.password),
        full_name       = req.name.strip(),
        role            = role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _make_token(user)
    return {"user": _user_dict(user, token)}


@router.post("/auth/login")
def legacy_login(req: _LoginReq, db: Session = Depends(get_db)):
    """Login — returns {user: {id, name, email, role, token}}."""
    if not req.email.strip() or not req.password.strip():
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled.")

    token = _make_token(user)
    return {"user": _user_dict(user, token)}


@router.get("/auth/me")
def legacy_me(current_user: User = Depends(get_current_active_user)):
    """Return current user profile."""
    return {
        "user": {
            "id":         current_user.id,
            "name":       current_user.full_name or "",
            "email":      current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        }
    }


@router.put("/auth/profile")
def legacy_update_profile(
    req: _ProfileUpdateReq,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update name and/or email."""
    if req.email:
        existing = (
            db.query(User)
            .filter(User.email == req.email.lower().strip(), User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use by another account")

    changed = False
    if req.name and req.name.strip():
        current_user.full_name = req.name.strip()
        changed = True
    if req.email and req.email.strip():
        current_user.email = req.email.lower().strip()
        changed = True

    if not changed:
        raise HTTPException(status_code=400, detail="No fields to update")

    db.commit()
    db.refresh(current_user)
    token = _make_token(current_user)
    return {"user": _user_dict(current_user, token)}


@router.put("/auth/change-password")
def legacy_change_password(
    req: _PasswordChangeReq,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Change password."""
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()

    new_token = _make_token(current_user)
    return {"status": "password_changed", "token": new_token}


@router.delete("/auth/delete-account")
def legacy_delete_account(
    req: _DeleteAccountReq,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete account and all associated data."""
    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Password is incorrect")

    # Delete user data blobs
    db.query(UserData).filter(UserData.user_id == current_user.id).delete()
    # Delete the user (cascades to resumes, jobs, etc.)
    db.delete(current_user)
    db.commit()
    return {"status": "account_deleted"}


# ─────────────────────────────────────────────
#  User Data endpoints  (key-value JSON blobs)
# ─────────────────────────────────────────────

@router.post("/user/data")
def save_user_data(
    req: UserDataCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Upsert a user data blob (parsed_resume, resume_build, job_description, …)."""
    row = (
        db.query(UserData)
        .filter(UserData.user_id == current_user.id, UserData.data_type == req.data_type)
        .first()
    )
    if row:
        row.data_json = json.dumps(req.data)
    else:
        row = UserData(
            user_id   = current_user.id,
            data_type = req.data_type,
            data_json = json.dumps(req.data),
        )
        db.add(row)
    db.commit()
    return {"status": "saved", "data_type": req.data_type}


@router.get("/user/data/{data_type}")
def get_user_data(
    data_type: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Load a single user data blob by type."""
    row = (
        db.query(UserData)
        .filter(UserData.user_id == current_user.id, UserData.data_type == data_type)
        .first()
    )
    if not row:
        return {"data": None}
    return {
        "data":       json.loads(row.data_json),
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/user/data")
def get_all_user_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Load all saved data blobs for the current user."""
    rows = (
        db.query(UserData)
        .filter(UserData.user_id == current_user.id)
        .all()
    )
    result = {}
    for row in rows:
        result[row.data_type] = {
            "data":       json.loads(row.data_json),
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
    return result
