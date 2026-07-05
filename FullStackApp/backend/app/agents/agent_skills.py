"""
app/agents/agent_skills.py — ADK-style Agent Skills Registry.

===========================================================================
WHAT ARE AGENT SKILLS?
===========================================================================
  In the Google ADK model, "skills" are self-describing, callable units
  of capability that an agent can discover and invoke. They are analogous
  to MCP tools, but at the agent layer rather than the transport layer.

  Each skill:
    - Has a unique name and human-readable description
    - Declares its input/output schema
    - Is discoverable via the skill registry
    - Can be invoked by the agents CLI or by any agent in the system

  This module implements the ADK skill pattern for the ResumeScanner
  multi-agent system. The same logic is already exposed via the MCP
  server — this registry makes it accessible to the agents CLI and to
  future ADK agent runners.

===========================================================================
SKILLS REGISTERED:
===========================================================================
  1. SkillScanFile           — magic-byte MIME validation
  2. SkillRedactPII          — regex PII detection + redaction
  3. SkillScoreResume        — local ML classification (offline)
  4. SkillGenerateFeedback   — FeedbackAgent LLM reasoning
  5. SkillLogAudit           — immutable audit trail write

===========================================================================
DESIGN — EXTENSIBILITY:
===========================================================================
  To add a new skill:
    1. Define a function that takes a dict of params and returns a dict.
    2. Create a Skill object with name, description, input_schema, handler.
    3. Register it with: SKILL_REGISTRY.register(your_skill)
    4. It will automatically appear in `cli_agent.py list-skills` and
       be callable via `cli_agent.py run SkillName`.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)



# Skill data class — the ADK FunctionTool equivalent


@dataclass
class Skill:
    """
    A self-describing, callable agent skill.

    Attributes:
        name:         Unique skill identifier (used in CLI and registry lookup).
        description:  Human-readable description of what this skill does.
        input_schema: Dict describing expected input parameters.
        output_schema: Dict describing the return value structure.
        handler:      Callable that executes the skill logic.
        category:     Grouping for display purposes (e.g., "Security", "Analysis").
        requires_db:  True if the skill needs a database session.
        requires_llm: True if the skill makes LLM API calls.
    """
    name: str
    description: str
    input_schema: dict
    output_schema: dict
    handler: Callable[[dict], dict]
    category: str = "General"
    requires_db: bool = False
    requires_llm: bool = False
    examples: list[dict] = field(default_factory=list)

    def invoke(self, params: dict, **kwargs) -> dict:
        """
        Invoke this skill with the given parameters.

        Args:
            params: Input parameters matching input_schema.
            **kwargs: Extra context (e.g., db_session, resume_id).

        Returns:
            Dict matching output_schema.
        """
        logger.info("[SkillRegistry] Invoking skill: %s", self.name)
        try:
            return self.handler(params, **kwargs)
        except TypeError:
            # Some handlers don't accept **kwargs — call with params only.
            return self.handler(params)



# Skill Registry — discovery and dispatch


class SkillRegistry:
    """
    Central registry for all agent skills.

    Supports:
      - Skill registration (at module load time)
      - Skill discovery (list all registered skills)
      - Skill lookup by name
      - Skill invocation by name with parameter validation
    """

    def __init__(self):
        self._skills: dict[str, Skill] = {}

    def register(self, skill: Skill) -> None:
        """Register a skill. Overwrites if already registered (allows hot-reload)."""
        self._skills[skill.name] = skill
        logger.debug("[SkillRegistry] Registered skill: %s", skill.name)

    def get(self, name: str) -> Optional[Skill]:
        """Look up a skill by name. Returns None if not found."""
        return self._skills.get(name)

    def list_skills(self) -> list[Skill]:
        """Return all registered skills, sorted alphabetically by name."""
        return sorted(self._skills.values(), key=lambda s: s.name)

    def invoke(self, skill_name: str, params: dict, **kwargs) -> dict:
        """
        Invoke a skill by name.

        Args:
            skill_name: Name of the skill to invoke.
            params: Input parameters for the skill.
            **kwargs: Extra context passed to the handler.

        Returns:
            Dict result from the skill handler.

        Raises:
            KeyError: If skill_name is not registered.
        """
        skill = self._skills.get(skill_name)
        if skill is None:
            available = list(self._skills.keys())
            raise KeyError(
                f"Skill '{skill_name}' not found. Available: {available}"
            )
        return skill.invoke(params, **kwargs)

    def to_mcp_tool_list(self) -> list[dict]:
        """
        Export all skills as MCP-compatible tool definitions.

        This allows the skill registry to feed directly into the MCP server
        without duplicating tool definitions.
        """
        return [
            {
                "name": skill.name,
                "description": skill.description,
                "inputSchema": {
                    "type": "object",
                    "properties": skill.input_schema,
                    "required": list(skill.input_schema.keys()),
                },
            }
            for skill in self.list_skills()
        ]



# Skill handler implementations


def _handler_scan_file(params: dict, **_kwargs) -> dict:
    """
    SkillScanFile handler.

    Validates a file's true MIME type using magic bytes.
    Detects files that have been renamed to bypass extension-based checks
    (e.g., a malicious .exe renamed to .pdf).

    Input params:
        file_path: str — Path to the file to scan (local filesystem).
        filename:  str — Original filename (for extension cross-check).
    """
    import os
    from app.tools.security_scanner import scan_file

    file_path = params.get("file_path", "")
    filename = params.get("filename", os.path.basename(file_path))

    if not file_path or not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}", "passed": False}

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    result = scan_file(file_bytes, filename)
    return result


def _handler_redact_pii(params: dict, **_kwargs) -> dict:
    """
    SkillRedactPII handler.

    Detects and redacts PII from resume text using regex patterns.
    Covers: email, Indian phone, PAN card, Aadhaar, SSN.

    Input params:
        text: str — Raw text to redact PII from.
    """
    from app.tools.pii_redactor import redact_pii

    text = params.get("text", "")
    if not text.strip():
        return {"error": "text is empty", "redacted_text": "", "redaction_count": 0, "types_found": []}

    return redact_pii(text)


def _handler_score_resume(params: dict, **_kwargs) -> dict:
    """
    SkillScoreResume handler.

    Classifies a resume using the local offline ML model (TF-IDF + classifier).
    No external API calls — fully private, no PII risk.

    Input params:
        resume_text:   str      — Resume text to classify.
        model_version: str|None — Optional model version (default: best available).
    """
    resume_text = params.get("resume_text", "")
    model_version = params.get("model_version")

    if not resume_text.strip():
        return {"error": "resume_text is empty", "predicted_category": "Unknown", "confidence": 0.0}

    try:
        from app.routes.predict import _resolve_model, _classify_with_bundle
        model_bundle = _resolve_model(model_version)
        if model_bundle is None:
            return {"error": "No ML model available", "predicted_category": "Unknown", "confidence": 0.0}
        result = _classify_with_bundle(resume_text, model_bundle)
        result["scoreable"] = True
        return result
    except Exception as exc:
        logger.error("[SkillScoreResume] Failed: %s", exc)
        return {"error": str(exc), "predicted_category": "Unknown", "confidence": 0.0}


def _handler_generate_feedback(params: dict, **kwargs) -> dict:
    """
    SkillGenerateFeedback handler.

    Runs the FeedbackAgent to produce structured, actionable resume
    improvement feedback. This skill invokes an LLM (Gemini or Groq).

    Input params:
        redacted_resume_text: str      — PII-redacted resume text.
        score_result:         dict     — Output from SkillScoreResume.
        job_description:      str|None — Optional JD for targeted analysis.
    """
    from app.agents.feedback_agent import run_feedback_agent

    redacted_text = params.get("redacted_resume_text", "")
    score_result = params.get("score_result", {})
    job_description = params.get("job_description")
    db_session = kwargs.get("db_session")
    resume_id = kwargs.get("resume_id")

    if not redacted_text.strip():
        return {"error": "redacted_resume_text is empty"}

    if not score_result:
        return {"error": "score_result is required (run SkillScoreResume first)"}

    return run_feedback_agent(
        redacted_resume_text=redacted_text,
        score_result=score_result,
        job_description=job_description,
        db_session=db_session,
        resume_id=resume_id,
    )


def _handler_log_audit(params: dict, **kwargs) -> dict:
    """
    SkillLogAudit handler.

    Writes one row to the audit_log table.
    The detail field must contain ONLY counts/categories — never raw PII.

    Input params:
        step_name: str      — Pipeline step name.
        status:    str      — 'passed' | 'failed' | 'error' | 'skipped'.
        detail:    str      — PII-free summary string.
        resume_id: str|None — FK to resumes table (optional).
    """
    from app.tools.audit_logger import log_step

    step_name = params.get("step_name", "unknown")
    status = params.get("status", "unknown")
    detail = params.get("detail", "")
    resume_id = params.get("resume_id") or kwargs.get("resume_id")
    db_session = kwargs.get("db_session")

    # Attempt real DB session if none provided.
    if db_session is None:
        try:
            from app.database.session import SessionLocal
            db_session = SessionLocal()
            try:
                log_step(db_session, step_name, status, detail, resume_id)
            finally:
                db_session.close()
            db_session = None  # Mark as handled
        except Exception as exc:
            # Fall back to console-only logging.
            log_step(None, step_name, status, detail, resume_id)
            return {"logged": True, "warning": f"DB unavailable: {exc}", "step_name": step_name}
    else:
        log_step(db_session, step_name, status, detail, resume_id)

    return {"logged": True, "step_name": step_name, "status": status}



# Skill definitions — registered at module load time


_SKILL_SCAN_FILE = Skill(
    name="SkillScanFile",
    description=(
        "Validate a file's true MIME type from its magic bytes against an allowlist "
        "(PDF, DOCX, plain text). Detects renamed files (e.g., malware.exe renamed to resume.pdf). "
        "Returns: {passed: bool, detected_type: str, reason: str|null}."
    ),
    category="Security",
    requires_db=False,
    requires_llm=False,
    input_schema={
        "file_path": {
            "type": "string",
            "description": "Absolute path to the file on the local filesystem",
        },
        "filename": {
            "type": "string",
            "description": "Original filename (used for extension cross-check)",
        },
    },
    output_schema={
        "passed": {"type": "boolean"},
        "detected_type": {"type": "string"},
        "reason": {"type": "string", "nullable": True},
    },
    handler=_handler_scan_file,
    examples=[
        {"params": {"file_path": "/tmp/resume.pdf", "filename": "resume.pdf"}},
    ],
)

_SKILL_REDACT_PII = Skill(
    name="SkillRedactPII",
    description=(
        "Detect and redact PII from resume text using regex patterns. "
        "Patterns cover: email, Indian mobile phone, PAN card, Aadhaar, SSN. "
        "Returns: {redacted_text: str, redaction_count: int, types_found: list[str]}."
    ),
    category="Security",
    requires_db=False,
    requires_llm=False,
    input_schema={
        "text": {
            "type": "string",
            "description": "Raw resume text to detect and redact PII from",
        },
    },
    output_schema={
        "redacted_text": {"type": "string"},
        "redaction_count": {"type": "integer"},
        "types_found": {"type": "array", "items": {"type": "string"}},
    },
    handler=_handler_redact_pii,
    examples=[
        {"params": {"text": "Contact: john.doe@gmail.com or +91-9876543210"}},
    ],
)

_SKILL_SCORE_RESUME = Skill(
    name="SkillScoreResume",
    description=(
        "Classify a resume using the local offline ML model (TF-IDF + classifier). "
        "No external API calls — fully private, no PII risk. "
        "Returns: {predicted_category: str, confidence: float, top_categories: list}."
    ),
    category="Analysis",
    requires_db=False,
    requires_llm=False,
    input_schema={
        "resume_text": {
            "type": "string",
            "description": "Resume text to classify (original, non-redacted is fine — fully local)",
        },
        "model_version": {
            "type": "string",
            "description": "Model version to use (optional; defaults to best available: v6)",
        },
    },
    output_schema={
        "predicted_category": {"type": "string"},
        "confidence": {"type": "number"},
        "top_categories": {"type": "array"},
    },
    handler=_handler_score_resume,
    examples=[
        {"params": {"resume_text": "Python developer with 5 years of ML experience..."}},
    ],
)

_SKILL_GENERATE_FEEDBACK = Skill(
    name="SkillGenerateFeedback",
    description=(
        "Run the FeedbackAgent — a second LLM agent that takes the ML score result "
        "and produces structured, actionable resume improvement advice. "
        "Identifies skill gaps, prioritizes improvements, and estimates ATS score boosts. "
        "Requires: redacted_resume_text + score_result from SkillScoreResume."
    ),
    category="Analysis",
    requires_db=False,
    requires_llm=True,
    input_schema={
        "redacted_resume_text": {
            "type": "string",
            "description": "PII-redacted resume text (output of SkillRedactPII.redacted_text)",
        },
        "score_result": {
            "type": "object",
            "description": "Score result dict from SkillScoreResume",
        },
        "job_description": {
            "type": "string",
            "description": "Optional job description for targeted gap analysis",
        },
    },
    output_schema={
        "skill_gaps": {"type": "array"},
        "improvements": {"type": "array"},
        "ats_summary": {"type": "string"},
        "category_fit": {"type": "string"},
        "agent_used_llm": {"type": "boolean"},
    },
    handler=_handler_generate_feedback,
    examples=[
        {
            "params": {
                "redacted_resume_text": "Software engineer with Python, Django...",
                "score_result": {"predicted_category": "Data Science", "confidence": 0.87},
            }
        },
    ],
)

_SKILL_LOG_AUDIT = Skill(
    name="SkillLogAudit",
    description=(
        "Write one row to the audit_log table recording a pipeline step. "
        "The detail field must contain ONLY counts/categories — never raw PII values. "
        "Returns: {logged: bool}."
    ),
    category="Audit",
    requires_db=True,
    requires_llm=False,
    input_schema={
        "step_name": {
            "type": "string",
            "description": "Step name: 'scan' | 'redact' | 'score' | 'feedback' | 'llm_call'",
        },
        "status": {
            "type": "string",
            "description": "Outcome: 'passed' | 'failed' | 'skipped' | 'error'",
        },
        "detail": {
            "type": "string",
            "description": "PII-free detail string (counts/categories only — never raw PII)",
        },
        "resume_id": {
            "type": "string",
            "description": "FK to resumes.id (optional)",
        },
    },
    output_schema={
        "logged": {"type": "boolean"},
        "step_name": {"type": "string"},
        "status": {"type": "string"},
    },
    handler=_handler_log_audit,
    examples=[
        {"params": {"step_name": "scan", "status": "passed", "detail": "PDF detected; scan passed"}},
    ],
)



# Module-level singleton registry — import this and call registry methods.


SKILL_REGISTRY = SkillRegistry()

# Register all skills at module import time.
SKILL_REGISTRY.register(_SKILL_SCAN_FILE)
SKILL_REGISTRY.register(_SKILL_REDACT_PII)
SKILL_REGISTRY.register(_SKILL_SCORE_RESUME)
SKILL_REGISTRY.register(_SKILL_GENERATE_FEEDBACK)
SKILL_REGISTRY.register(_SKILL_LOG_AUDIT)

logger.info(
    "[SkillRegistry] %d skills registered: %s",
    len(SKILL_REGISTRY.list_skills()),
    [s.name for s in SKILL_REGISTRY.list_skills()],
)
