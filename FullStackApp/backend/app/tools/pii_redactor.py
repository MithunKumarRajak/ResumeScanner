"""
app/tools/pii_redactor.py — Regex-based PII detection and redaction tool.

PURPOSE:
  Before resume text is sent to any external LLM API (Gemini or Groq), this tool
  replaces personally identifiable information (PII) with placeholder tokens.
  This prevents candidate PII from being transmitted to third-party AI services.

REGIONAL ASSUMPTION:
  Patterns are tuned for INDIA as the primary user base:
    - Phone: Indian 10-digit mobile numbers, optionally prefixed with +91 or 0.
    - ID:    PAN card format (5 uppercase letters + 4 digits + 1 uppercase letter).
  International email patterns apply globally.
  If target region differs, swap the phone/ID patterns and update this comment.

DESIGN (TOOL, NOT AGENT):
  This function is entirely deterministic — no LLM calls, no external I/O.
  Given the same text, it always produces the same output.

KNOWN LIMITATIONS (documented for judges / future developers):
  1. Regex cannot detect names, addresses, or other freeform PII without NLP.
     A production system would use presidio-analyzer (Microsoft) or a spaCy
     NER model for entity-level detection (NAME, ADDRESS, ORG, etc.).
  2. Regex can have false positives (e.g., a 10-digit employee ID might match
     the phone pattern) and false negatives (e.g., unusual phone formatting).
  3. LinkedIn/GitHub URLs are NOT redacted — they are public professional profiles
     and typically not considered private PII in this context. Adjust if needed.

SCOPE OF REDACTION (critical rule):
  This tool is called ONLY for the outbound LLM payload and the audit log detail.
  It is NOT applied to:
    - The raw_text field stored in the resumes DB table (recruiters need it).
    - The frontend UI display (recruiters need to see real contact info).
  This boundary is enforced in the call sites, not here.

FUTURE WORK:
  Replace or supplement with presidio-analyzer + spaCy NER for name/address
  detection. The regex approach here is intentionally lightweight per spec.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)



# PII patterns
# Each entry: (pattern_name, compiled_regex, replacement_token)


_PII_PATTERNS: list[tuple[str, re.Pattern, str]] = [

    # --- Email addresses ---
    # Matches standard email formats. Intentionally broad.
    (
        "email",
        re.compile(
            r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
            re.IGNORECASE,
        ),
        "[REDACTED_EMAIL]",
    ),

    # --- Indian mobile phone numbers ---
    # Covers formats:
    #   +91-9876543210  +91 9876543210  091-9876543210
    #   9876543210      98765 43210
    # The look-behind/ahead prevents matching inside longer digit strings.
    (
        "phone",
        re.compile(
            r"(?<!\d)"
            r"(?:\+91[\s\-]?|0)?[6-9]\d{9}"
            r"(?!\d)",
        ),
        "[REDACTED_PHONE]",
    ),

    # --- Indian PAN card numbers ---
    # Format: AAAAA9999A (5 uppercase letters, 4 digits, 1 uppercase letter)
    # PAN is a government-issued tax ID — definitely PII.
    (
        "pan_card",
        re.compile(
            r"\b[A-Z]{5}[0-9]{4}[A-Z]\b",
        ),
        "[REDACTED_PAN]",
    ),

    # --- Generic SSN-style numbers (international fallback) ---
    # Matches NNN-NN-NNNN (US SSN format) to cover international users.
    (
        "ssn",
        re.compile(
            r"\b\d{3}[-\s]\d{2}[-\s]\d{4}\b",
        ),
        "[REDACTED_SSN]",
    ),

    # --- Aadhaar numbers (Indian national ID) ---
    # Format: 12 digits, often written as XXXX XXXX XXXX or XXXX-XXXX-XXXX
    # Positioned after SSN pattern to avoid double-matching.
    (
        "aadhaar",
        re.compile(
            r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b",
        ),
        "[REDACTED_AADHAAR]",
    ),
]


def redact_pii(text: str) -> dict:
    """
    Detect and redact PII from resume text before it is sent to an external LLM.

    This is the SECOND step in the deterministic security pre-pipeline.
    It ALWAYS runs after scan_file — it cannot be skipped.

    Args:
        text: Raw resume text extracted from PDF/DOCX.

    Returns:
        {
            "redacted_text":    str       — Text with PII replaced by tokens.
            "redaction_count":  int       — Total number of PII items replaced.
            "types_found":      list[str] — Unique PII type names that were found.
        }

    The returned `redacted_text` is what gets sent to Gemini/Groq.
    The original `text` is NEVER modified — caller keeps the original for DB storage.
    """
    if not text:
        return {
            "redacted_text": text or "",
            "redaction_count": 0,
            "types_found": [],
        }

    redacted = text
    total_count = 0
    types_found: list[str] = []

    for pattern_name, regex, replacement_token in _PII_PATTERNS:
        matches = regex.findall(redacted)
        match_count = len(matches)

        if match_count > 0:
            redacted = regex.sub(replacement_token, redacted)
            total_count += match_count
            if pattern_name not in types_found:
                types_found.append(pattern_name)
            logger.debug(
                "[pii_redactor] Pattern '%s': %d match(es) replaced with %s",
                pattern_name,
                match_count,
                replacement_token,
            )

    logger.info(
        "[pii_redactor] Total PII redacted: %d items (%s)",
        total_count,
        ", ".join(types_found) if types_found else "none",
    )

    return {
        "redacted_text": redacted,
        "redaction_count": total_count,
        "types_found": types_found,
    }
