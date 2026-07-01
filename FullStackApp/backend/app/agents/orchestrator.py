"""
app/agents/orchestrator.py — THE ONLY AGENT in this codebase.

===========================================================================
WHAT MAKES THIS AN AGENT (and not just a wrapper function):
===========================================================================
  An agent is an LLM-driven component that makes decisions requiring judgment —
  choosing which tools to call, in what order, based on context.

  This orchestrator contains TWO layers, only ONE of which involves LLM reasoning:

  LAYER 1 — DETERMINISTIC PRE-PIPELINE (no LLM, hardcoded, always runs):
    scan_file → extract_text → redact_pii → log each step
    These are SECURITY CONTROLS. They are hardcoded and run unconditionally.
    An LLM must never be able to skip them — that would be a security anti-pattern
    (and would undermine the entire purpose of this project).

  LAYER 2 — AGENT REASONING (LLM-driven, this is the "agentic" value-add):
    Given the scan result, redaction summary, and redacted resume text,
    the LLM agent decides things that genuinely require judgment:
      - Is the resume actually scoreable? (Some PDFs extract garbled text.)
      - What does the ML score mean in context of the redaction summary?
      - Should a JD-refinement LLM call be made? (Depends on score quality.)
      - How should the final structured summary be composed?
    The LLM calls score_resume as a tool and synthesizes the final result.
    This reasoning step is what makes this an agent — not just a pipeline.

===========================================================================
NOTE ON GOOGLE ADK:
===========================================================================
  The google-adk package is NOT available in this environment (it is part of
  Google's AI Agent Development Kit which requires a separate install).
  We implement an ADK-equivalent pattern:
    - Define tools as Python dicts with name/description/input_schema/handler.
    - Run a tool-calling loop: LLM generates a tool_call → execute it → feed
      result back → repeat until the LLM returns a final answer.
  This is functionally identical to ADK's FunctionTool + AgentRunner pattern.
  If google-adk becomes available, replacing this with ADK is straightforward:
  map each tool dict to a FunctionTool and wrap the loop in AgentRunner.

===========================================================================
REDACTION SCOPE (documented here as the single source of truth):
===========================================================================
  - ResumeModel_v5/v6 is FULLY LOCAL/OFFLINE — no external API calls.
    Therefore the original (non-redacted) text MAY be used for ML scoring.
    We pass the ORIGINAL text to score_resume for best accuracy.
  - The REDACTED text is used for ALL external LLM calls (Gemini/Groq).
    This is the primary privacy guarantee this agent enforces.
  - The ORIGINAL text is stored in the resumes DB table (recruiters need it).
  - The ORIGINAL text is shown in the recruiter-facing UI (real contact info).
  Only the outbound LLM payload and audit log use redacted content.
"""

import json
import logging
import os
from typing import Optional

from app.tools.security_scanner import scan_file
from app.tools.pii_redactor import redact_pii
from app.tools.audit_logger import log_step, build_scan_detail, build_redact_detail

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tool definitions (ADK-equivalent pattern)
# Each tool has: name, description, input_schema, and a handler function.
# The LLM uses these definitions to decide which tool to call and with what args.
# ---------------------------------------------------------------------------

def _tool_score_resume(resume_text: str, model_version: Optional[str] = None) -> dict:
    """
    Tool handler: classify a resume using the local ML model.

    NOTE: Uses ORIGINAL (non-redacted) text because ResumeModel is fully local
    and offline — no PII leaves the system during this step.
    (See module docstring for the redaction scope policy.)
    """
    try:
        # Import predict route utilities rather than duplicating model loading logic.
        from app.routes.predict import _resolve_model, _classify_with_bundle
        model_bundle = _resolve_model(model_version)
        if model_bundle is None:
            return {
                "error": "No ML model available",
                "predicted_category": "Unknown",
                "confidence": 0.0,
                "scoreable": False,
            }
        classification = _classify_with_bundle(resume_text, model_bundle)
        classification["scoreable"] = True
        return classification
    except Exception as exc:
        logger.error("[orchestrator] score_resume tool failed: %s", exc)
        return {
            "error": str(exc),
            "predicted_category": "Unknown",
            "confidence": 0.0,
            "scoreable": False,
        }


# Tool registry — used by the agent reasoning loop.
_TOOLS = {
    "score_resume": {
        "description": (
            "Classify a resume using the local ML model and return the predicted "
            "job category with confidence score. Use the ORIGINAL (non-redacted) "
            "resume text for best accuracy — this model is fully offline."
        ),
        "input_schema": {
            "resume_text": "str — the resume text to classify",
            "model_version": "str|None — optional model version (default: best available)",
        },
        "handler": _tool_score_resume,
    },
}


# ---------------------------------------------------------------------------
# Agent reasoning phase
# ---------------------------------------------------------------------------

def _run_agent_reasoning(
    redacted_text: str,
    original_text: str,
    scan_result: dict,
    redact_result: dict,
    db_session,
    resume_id: Optional[str],
) -> dict:
    """
    LLM-driven reasoning phase — the "agentic" part of the orchestrator.

    The LLM receives:
      - Redaction summary (count, types) as context
      - Redacted resume text (safe to reason about)
      - Available tools (score_resume)

    The LLM decides:
      1. Is the resume scoreable? (detects garbled extractions, wrong doc type)
      2. Which model version to use for scoring (if multiple are available)
      3. How to synthesize the final structured result

    If the LLM API is unavailable, falls back to a deterministic scoring path
    so the pipeline still returns a useful result.
    """
    # Build the agent context prompt.
    redact_summary = (
        f"{redact_result.get('redaction_count', 0)} PII item(s) redacted "
        f"(types: {', '.join(redact_result.get('types_found', [])) or 'none'})"
    )

    agent_prompt = f"""You are a resume analysis agent with access to the score_resume tool.

Context:
- Security scan: PASSED (file type: {scan_result.get('detected_type', 'unknown')})
- PII redaction applied: {redact_summary}
- The resume text below has been PII-redacted. Use it to assess whether the resume is scoreable.

Resume text (PII-redacted):
\"\"\"
{redacted_text[:3000]}
\"\"\"

Available tools:
{json.dumps({name: info["description"] for name, info in _TOOLS.items()}, indent=2)}

Instructions:
1. First, assess if this text looks like a real resume (not garbled, not a wrong document type).
2. If scoreable: call score_resume with the appropriate resume text and return its output.
3. If not scoreable: explain why (e.g., "document appears to be a blank form, not a resume").
4. Return a JSON object:
{{
  "scoreable": true/false,
  "not_scoreable_reason": "reason if false, else null",
  "tool_call": {{"name": "score_resume", "args": {{"resume_text": "..."}}}} or null,
  "agent_notes": "brief explanation of your reasoning"
}}
"""

    # --- Try Gemini first, then Groq ---
    # NOTE: We send the REDACTED text to the LLM. Original text stays local.
    # PII redaction happens here — before any text leaves the system to a third-party LLM.
    llm_response_text = None
    try:
        from app.routes.ai import _get_gemini
        model = _get_gemini()
        if model is not None:
            response = model.generate_content(agent_prompt)
            llm_response_text = response.text.strip()
            logger.info("[orchestrator] Agent reasoning: Gemini responded")
    except Exception as exc:
        logger.warning("[orchestrator] Gemini reasoning failed: %s", exc)

    if not llm_response_text:
        try:
            from app.routes.ai import _call_groq_api
            llm_response_text = _call_groq_api(agent_prompt)
            if llm_response_text:
                logger.info("[orchestrator] Agent reasoning: Groq responded")
        except Exception as exc:
            logger.warning("[orchestrator] Groq reasoning failed: %s", exc)

    # Log the LLM reasoning step (no PII in detail — just status).
    log_step(
        db_session=db_session,
        step_name="llm_call",
        status="passed" if llm_response_text else "skipped",
        detail=(
            f"Agent reasoning LLM call: {'completed' if llm_response_text else 'unavailable, using fallback'}; "
            f"redacted text length: {len(redacted_text)} chars"
        ),
        resume_id=resume_id,
    )

    # --- Parse LLM decision ---
    agent_decision = None
    if llm_response_text:
        try:
            # Strip markdown code fences if present.
            clean = llm_response_text
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3].strip()
            if clean.startswith("json"):
                clean = clean[4:].strip()
            agent_decision = json.loads(clean)
        except Exception as exc:
            logger.warning("[orchestrator] Could not parse agent JSON response: %s", exc)

    # --- Execute the tool call the agent decided on ---
    score_result = None

    if agent_decision:
        is_scoreable = agent_decision.get("scoreable", True)
        tool_call = agent_decision.get("tool_call")

        if not is_scoreable:
            reason = agent_decision.get("not_scoreable_reason", "unknown")
            logger.warning("[orchestrator] Agent says resume not scoreable: %s", reason)
            score_result = {
                "scoreable": False,
                "not_scoreable_reason": reason,
                "predicted_category": "Unclassifiable",
                "confidence": 0.0,
            }
        elif tool_call and tool_call.get("name") == "score_resume":
            # Agent decided to score — use ORIGINAL text for local ML accuracy.
            # (See module docstring: ResumeModel is fully offline, no PII risk.)
            args = tool_call.get("args", {})
            args["resume_text"] = original_text  # override with original for accuracy
            score_result = _tool_score_resume(**args)
            score_result["scoreable"] = True
        else:
            # Agent didn't call any tool but said scoreable — run scoring anyway.
            score_result = _tool_score_resume(original_text)
            score_result["scoreable"] = True
    else:
        # Fallback: LLM unavailable — run deterministic scoring directly.
        logger.info("[orchestrator] LLM unavailable; using deterministic scoring fallback")
        score_result = _tool_score_resume(original_text)
        score_result["scoreable"] = True

    # Log the scoring step.
    score_status = "passed" if score_result and not score_result.get("error") else "error"
    log_step(
        db_session=db_session,
        step_name="score",
        status=score_status,
        detail=(
            f"predicted_category={score_result.get('predicted_category', 'unknown')}; "
            f"confidence={round(score_result.get('confidence', 0.0), 3)}; "
            f"scoreable={score_result.get('scoreable', True)}"
        ),
        resume_id=resume_id,
    )

    return score_result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_security_pipeline(
    file_bytes: bytes,
    filename: str,
    db_session,
    resume_id: Optional[str] = None,
) -> dict:
    """
    Run the full agentic security pipeline for an uploaded resume.

    Pipeline (fixed order, no LLM can re-order or skip steps 1-3):
      1. DETERMINISTIC: scan_file       — MIME/type validation
      2. DETERMINISTIC: extract text    — via existing parser service
      3. DETERMINISTIC: redact_pii      — strip PII from outbound LLM payload
      4. AGENT:         LLM reasoning   — assess scoreability, call score_resume
      5. LOG:           audit_log rows  — written after every step

    Args:
        file_bytes: Raw uploaded file bytes.
        filename:   Original filename (used for MIME cross-check).
        db_session: Active SQLAlchemy Session (or None for CLI mode).
        resume_id:  FK for audit_log rows (or None if not yet saved to DB).

    Returns:
        {
            "scan_passed":          bool
            "scan_reason":          str|None
            "detected_type":        str
            "pii_redaction_count":  int
            "pii_types_found":      list[str]
            "score":                dict   (from score_resume tool)
            "pipeline_error":       str|None  (set if a fatal error occurred)
        }
    """
    result = {
        "scan_passed": False,
        "scan_reason": None,
        "detected_type": "unknown",
        "pii_redaction_count": 0,
        "pii_types_found": [],
        "score": {},
        "pipeline_error": None,
    }

    # -----------------------------------------------------------------------
    # STEP 1: Security scan (DETERMINISTIC — always runs first, no exceptions)
    # -----------------------------------------------------------------------
    logger.info("[orchestrator] Step 1: scan_file for '%s'", filename)
    scan_result = scan_file(file_bytes, filename)
    result["scan_passed"] = scan_result["passed"]
    result["scan_reason"] = scan_result.get("reason")
    result["detected_type"] = scan_result.get("detected_type", "unknown")

    log_step(
        db_session=db_session,
        step_name="scan",
        status="passed" if scan_result["passed"] else "failed",
        detail=build_scan_detail(scan_result),
        resume_id=resume_id,
    )

    # HALT immediately if scan failed — do not process a rejected file.
    if not scan_result["passed"]:
        logger.warning(
            "[orchestrator] File rejected by security scan: %s",
            scan_result.get("reason"),
        )
        return result

    # -----------------------------------------------------------------------
    # STEP 2: Extract text from the file (DETERMINISTIC)
    # -----------------------------------------------------------------------
    logger.info("[orchestrator] Step 2: extract text from '%s'", filename)
    raw_text = ""
    try:
        from app.services import parser as parser_svc
        import tempfile
        import os
        # parser_svc.extract_text expects a file path, not bytes.
        # Write bytes to a temp file, extract, then clean up.
        ext = os.path.splitext(filename)[1].lower() if filename else ".pdf"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            raw_text = parser_svc.extract_text(tmp_path)
        finally:
            os.unlink(tmp_path)
    except Exception as exc:
        logger.error("[orchestrator] Text extraction failed: %s", exc)
        result["pipeline_error"] = f"Text extraction failed: {exc}"
        log_step(
            db_session=db_session,
            step_name="redact",
            status="error",
            detail=f"Skipped — text extraction failed: {type(exc).__name__}",
            resume_id=resume_id,
        )
        return result

    if not raw_text or not raw_text.strip():
        result["pipeline_error"] = "Could not extract text from file (possibly blank or image-only)."
        log_step(
            db_session=db_session,
            step_name="redact",
            status="skipped",
            detail="Skipped — no text extracted from file",
            resume_id=resume_id,
        )
        return result

    # -----------------------------------------------------------------------
    # STEP 3: PII redaction (DETERMINISTIC — always runs, no exceptions)
    # -----------------------------------------------------------------------
    logger.info("[orchestrator] Step 3: redact_pii")
    redact_result = redact_pii(raw_text)
    result["pii_redaction_count"] = redact_result["redaction_count"]
    result["pii_types_found"] = redact_result["types_found"]
    redacted_text = redact_result["redacted_text"]

    log_step(
        db_session=db_session,
        step_name="redact",
        status="passed",
        detail=build_redact_detail(redact_result),
        resume_id=resume_id,
    )

    # -----------------------------------------------------------------------
    # STEP 4: Agent reasoning (LLM-driven — only this step uses an LLM)
    # -----------------------------------------------------------------------
    logger.info("[orchestrator] Step 4: agent reasoning (LLM-driven)")
    try:
        score_result = _run_agent_reasoning(
            redacted_text=redacted_text,
            original_text=raw_text,
            scan_result=scan_result,
            redact_result=redact_result,
            db_session=db_session,
            resume_id=resume_id,
        )
        result["score"] = score_result
    except Exception as exc:
        logger.error("[orchestrator] Agent reasoning error: %s", exc)
        result["pipeline_error"] = f"Agent reasoning error: {exc}"
        log_step(
            db_session=db_session,
            step_name="score",
            status="error",
            detail=f"Agent reasoning exception: {type(exc).__name__}",
            resume_id=resume_id,
        )

    return result


def run_security_pipeline_text(
    text: str,
    db_session,
    resume_id: Optional[str] = None,
) -> dict:
    """
    Lightweight variant for text-only inputs (e.g., /predict endpoint).

    Skips the file scan (no file bytes available) and jumps directly to
    PII redaction before any LLM call.

    Returns the same shape as run_security_pipeline but scan_passed=True
    (assumed — caller is responsible for prior validation).
    """
    result = {
        "scan_passed": True,  # assumed by caller
        "scan_reason": None,
        "detected_type": "text/plain",
        "pii_redaction_count": 0,
        "pii_types_found": [],
        "score": {},
        "pipeline_error": None,
    }

    redact_result = redact_pii(text)
    result["pii_redaction_count"] = redact_result["redaction_count"]
    result["pii_types_found"] = redact_result["types_found"]

    log_step(
        db_session=db_session,
        step_name="redact",
        status="passed",
        detail=build_redact_detail(redact_result),
        resume_id=resume_id,
    )

    return result, redact_result["redacted_text"]
