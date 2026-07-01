"""
app/tools/security_scanner.py — File-type and MIME validation tool.

PURPOSE:
  Before any resume is processed, this tool verifies that the file is actually
  what it claims to be (PDF or DOCX), using magic-byte inspection rather than
  trusting the file extension alone. This prevents attackers from renaming a
  malicious file (e.g., an EXE) with a .pdf extension to bypass naive checks.

DESIGN (TOOL, NOT AGENT):
  This function is entirely deterministic — it reads bytes, calls libmagic,
  and returns a structured dict. No LLM reasoning, no side effects.

WHAT IT DOES NOT DO (documented limitations):
  - Does NOT scan for macros inside DOCX files (that would require oletools).
  - Does NOT scan for malware/viruses (that would require a dedicated AV engine).
  - Does NOT validate file content beyond MIME type (e.g., a blank PDF passes).
  These limitations are intentional — keeping dependencies light per project spec.
  Future work: integrate oletools for macro detection in DOCX files.

DEPENDENCIES:
  python-magic  — wraps libmagic for MIME detection from file bytes.
  On Linux/Docker: requires `apt-get install libmagic1`.
  On Windows:      requires `python-magic-bin` wheel (includes the DLL).
"""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Allowlist of accepted MIME types (true type detected from bytes, not header).
# Maps MIME type → set of expected file extensions as an extra sanity check.
# ---------------------------------------------------------------------------
_ALLOWED_MIME_TYPES: dict[str, list[str]] = {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    # Some environments report plain-text resumes with this type:
    "text/plain": [".txt"],
}


def _get_magic_mime(file_bytes: bytes) -> Optional[str]:
    """
    Detect the true MIME type from raw bytes using libmagic.

    Returns None if python-magic is not available (fallback: extension-only check).
    """
    try:
        import magic  # python-magic
        mime = magic.from_buffer(file_bytes, mime=True)
        return mime
    except ImportError:
        logger.warning(
            "[security_scanner] python-magic not installed; "
            "falling back to extension-only validation. "
            "Install python-magic (Linux) or python-magic-bin (Windows)."
        )
        return None
    except Exception as exc:
        logger.warning("[security_scanner] magic.from_buffer failed: %s", exc)
        return None


def scan_file(file_bytes: bytes, filename: str) -> dict:
    """
    Validate a file's true type against the allowlist.

    This is the FIRST step in the deterministic security pre-pipeline.
    It ALWAYS runs — it cannot be skipped by any LLM or calling code.

    Args:
        file_bytes: Raw file content read from the uploaded UploadFile.
        filename:   Original filename as declared by the client (used for
                    extension cross-check and error messages).

    Returns:
        {
            "passed":        bool   — True if file is safe to process.
            "detected_type": str    — MIME type detected from bytes.
            "reason":        str|None — Human-readable rejection reason,
                                        or None if passed.
        }

    Rejection triggers:
      1. Detected MIME type is not in the allowlist.
      2. File extension does not match the detected MIME type
         (e.g., a .exe renamed to .pdf is rejected).
      3. File is empty (0 bytes).
    """
    # --- Guard: empty file ---
    if not file_bytes:
        return {
            "passed": False,
            "detected_type": "unknown",
            "reason": "File is empty (0 bytes).",
        }

    # --- Determine file extension from declared filename ---
    ext = Path(filename).suffix.lower() if filename else ""

    # --- Detect true MIME from bytes ---
    detected_mime = _get_magic_mime(file_bytes)

    if detected_mime is None:
        # python-magic unavailable — fall back to extension-only check.
        # This is a degraded mode: still rejects unknown extensions,
        # but cannot catch renamed files.
        logger.warning(
            "[security_scanner] Degraded mode: MIME detection unavailable for '%s'. "
            "Using extension-only check.",
            filename,
        )
        if ext in {".pdf", ".docx", ".txt"}:
            return {
                "passed": True,
                "detected_type": f"extension-only/{ext}",
                "reason": None,
            }
        return {
            "passed": False,
            "detected_type": f"extension-only/{ext}",
            "reason": (
                f"File extension '{ext}' is not in the allowed list (.pdf, .docx). "
                "MIME detection unavailable."
            ),
        }

    # --- Check MIME against allowlist ---
    if detected_mime not in _ALLOWED_MIME_TYPES:
        return {
            "passed": False,
            "detected_type": detected_mime,
            "reason": (
                f"Detected file type '{detected_mime}' is not allowed. "
                f"Only PDF, DOCX, and plain text are accepted."
            ),
        }

    # --- Cross-check extension vs. detected MIME ---
    # This catches renamed files (e.g., malware.exe → resume.pdf).
    expected_extensions = _ALLOWED_MIME_TYPES[detected_mime]
    if ext and ext not in expected_extensions:
        return {
            "passed": False,
            "detected_type": detected_mime,
            "reason": (
                f"File extension '{ext}' does not match the detected file type "
                f"'{detected_mime}' (expected one of: {expected_extensions}). "
                "Possible file type mismatch or renamed file."
            ),
        }

    # --- Passed all checks ---
    return {
        "passed": True,
        "detected_type": detected_mime,
        "reason": None,
    }
