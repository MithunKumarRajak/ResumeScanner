"""
JWT creation/verification and password hashing utilities.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import TokenData

#  Password hashing ─

#  OAuth2 bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


#  JWT ─
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update(
        {"exp": expire, "iat": int(datetime.utcnow().timestamp())})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> TokenData:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        email:   str = payload.get("email")
        issued_at: int = payload.get("iat")
        if user_id is None:
            raise credentials_exc
        return TokenData(user_id=user_id, email=email, issued_at=issued_at)
    except JWTError:
        raise credentials_exc


#  FastAPI dependency ─
def _extract_token(request: Request, token: Optional[str]) -> Optional[str]:
    if token:
        return token

    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip() or None

    cookie_token = request.cookies.get("access_token")
    return cookie_token or None


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    raw_token = _extract_token(request, token)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = verify_token(raw_token)
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if token_data.issued_at and user.password_changed_at:
        if token_data.issued_at < int(user.password_changed_at.timestamp()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user


def get_optional_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Returns the user if a valid token is provided, otherwise returns None.
    Does not raise an exception for missing or invalid tokens.
    """
    raw_token = _extract_token(request, token)
    if not raw_token:
        return None

    try:
        token_data = verify_token(raw_token)
        user = db.query(User).filter(User.id == token_data.user_id).first()
        if user and user.is_active:
            return user
    except HTTPException:
        # This can happen if the token is invalid/expired
        return None
    except Exception:
        # Broad exception to catch any other potential errors during token validation
        return None

    return None
