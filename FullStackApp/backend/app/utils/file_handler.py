"""
File upload validation and local storage helpers.
"""
import os
import uuid
import shutil
from pathlib import Path
from typing import Tuple

from fastapi import HTTPException, UploadFile, status

from app.config import settings


def _get_upload_path(user_id: str) -> Path:
    """Returns the user-specific upload directory, creating it if needed."""
    path = Path(settings.UPLOAD_DIR) / user_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def validate_file(file: UploadFile) -> None:
    """
    Raises HTTP 400/413 if the file type or size is invalid.
    Content-type checking only — extension check is extra safety.
    """
    # Content-type check
    if file.content_type not in settings.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file.content_type}' not allowed. Upload PDF or DOCX only.",
        )

    # Extension check
    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".pdf", ".docx"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a .pdf or .docx extension.",
        )


async def save_upload_file(file: UploadFile, user_id: str) -> Tuple[str, str, int]:
    """
    Saves the uploaded file to local storage.

    Returns:
        (file_url, file_name, file_size_bytes)
    """
    upload_dir = _get_upload_path(user_id)
    ext = Path(file.filename or "resume").suffix.lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    dest = upload_dir / unique_name

    # Read content and check size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE // (1024 * 1024)} MB limit.",
        )

    dest.write_bytes(content)

    # Return relative path as URL (can be prefixed by a static file server)
    file_url = str(dest).replace("\\", "/")
    return file_url, file.filename or unique_name, len(content)


def delete_file(file_url: str) -> None:
    """Delete a stored file — silently ignores missing files."""
    try:
        path = Path(file_url)
        if path.exists():
            path.unlink()
    except Exception:
        pass
