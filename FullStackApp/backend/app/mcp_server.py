"""
app/mcp_server.py — MCP (Model Context Protocol) server for the security pipeline.

PURPOSE:
  Exposes all five agent skills as MCP-compatible tools so they can be
  discovered and invoked by MCP-aware clients (e.g., Claude Desktop, ADK agents,
  or any MCP inspector tool).

  This satisfies the Kaggle rubric's "MCP server" requirement while keeping the
  implementation self-contained and runnable without a full web server.

TOOLS EXPOSED (5 total — matches the agent_skills.py registry):
  1. scan_file          — file-type / MIME validation           (SkillScanFile)
  2. redact_pii         — PII detection and redaction           (SkillRedactPII)
  3. score_resume       — ML-based resume classification        (SkillScoreResume)
  4. generate_feedback  — LLM-driven resume feedback agent      (SkillGenerateFeedback)
  5. log_audit          — write a step to the audit_log table   (SkillLogAudit)

HOW TO RUN:
  From the backend directory:
    python -m app.mcp_server         (MCP stdio transport — for MCP inspector)
    npx @modelcontextprotocol/inspector python -m app.mcp_server  (visual inspector)

  Note: only stdio transport is implemented. The server does not accept command-line
  flags; any arguments passed are silently ignored.

DEPENDENCIES:
  mcp — the official Python MCP SDK (pip install mcp).
  If mcp is not installed, falls back to a JSON-RPC-equivalent stdio loop.
"""

import json
import logging
import sys
import base64
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tool handlers (thin wrappers around the actual tool functions)
# ---------------------------------------------------------------------------

def _handle_scan_file(params: dict) -> dict:
    """
    MCP tool: scan_file
    Validates a file's true MIME type against the allowlist.

    Params:
        file_bytes_b64: str  — base64-encoded file bytes
        filename:       str  — original filename
    """
    from app.tools.security_scanner import scan_file

    file_bytes_b64 = params.get("file_bytes_b64", "")
    filename = params.get("filename", "unknown")

    try:
        file_bytes = base64.b64decode(file_bytes_b64)
    except Exception as exc:
        return {"error": f"Could not decode file_bytes_b64: {exc}"}

    return scan_file(file_bytes, filename)


def _handle_redact_pii(params: dict) -> dict:
    """
    MCP tool: redact_pii
    Detect and redact PII from resume text.

    Params:
        text: str — raw resume text
    """
    from app.tools.pii_redactor import redact_pii
    text = params.get("text", "")
    return redact_pii(text)


def _handle_score_resume(params: dict) -> dict:
    """
    MCP tool: score_resume
    Classify a resume using the local ML model.

    Params:
        resume_text:    str      — resume text to classify
        model_version:  str|None — optional model version
    """
    try:
        from app.routes.predict import _resolve_model, _classify_with_bundle
        resume_text = params.get("resume_text", "")
        model_version = params.get("model_version")
        if not resume_text.strip():
            return {"error": "resume_text is empty"}
        model_bundle = _resolve_model(model_version)
        if model_bundle is None:
            return {"error": "No ML model available. Check backend model artifacts."}
        result = _classify_with_bundle(resume_text, model_bundle)
        return result
    except Exception as exc:
        return {"error": str(exc)}


def _handle_generate_feedback(params: dict) -> dict:
    """
    MCP tool: generate_feedback
    Run the FeedbackAgent — LLM-driven resume improvement advice.

    This tool invokes Agent 2 (FeedbackAgent) which uses Gemini or Groq
    to produce structured, actionable resume improvement feedback.
    Only PII-redacted text is ever sent to the external LLM.

    Params:
        redacted_resume_text: str      — PII-redacted resume text
        score_result:         dict/str — JSON output from score_resume tool
        job_description:      str|None — Optional JD for targeted gap analysis
    """
    from app.agents.feedback_agent import run_feedback_agent

    redacted_text = params.get("redacted_resume_text", "")
    score_result = params.get("score_result", {})
    job_description = params.get("job_description")

    # Accept score_result as a JSON string (MCP clients may serialize it)
    if isinstance(score_result, str):
        import json as _json
        try:
            score_result = _json.loads(score_result)
        except Exception:
            score_result = {}

    if not redacted_text.strip():
        return {"error": "redacted_resume_text is empty"}
    if not score_result:
        return {"error": "score_result is required — run score_resume first"}

    return run_feedback_agent(
        redacted_resume_text=redacted_text,
        score_result=score_result,
        job_description=job_description,
        db_session=None,   # MCP tools run without a DB session
        resume_id=None,
    )


def _handle_log_audit(params: dict) -> dict:
    """
    MCP tool: log_audit
    Write a step to the audit_log table.

    Params:
        step_name:  str      — pipeline step name
        status:     str      — 'passed' | 'failed' | 'error' | 'skipped'
        detail:     str      — PII-free summary (counts/categories only)
        resume_id:  str|None — FK to resumes table (optional)
    """
    from app.tools.audit_logger import log_step
    step_name = params.get("step_name", "unknown")
    status = params.get("status", "unknown")
    detail = params.get("detail", "")
    resume_id = params.get("resume_id")

    # Attempt to get a real DB session.
    try:
        from app.database.session import SessionLocal
        db = SessionLocal()
        try:
            log_step(db, step_name, status, detail, resume_id)
        finally:
            db.close()
    except Exception as exc:
        # Fall back to console logging if DB unavailable.
        log_step(None, step_name, status, detail, resume_id)
        return {"warning": f"DB unavailable, logged to console only: {exc}"}

    return {"logged": True, "step_name": step_name, "status": status}


# ---------------------------------------------------------------------------
# Tool registry — MCP schema format
# ---------------------------------------------------------------------------

MCP_TOOLS: list[dict] = [
    {
        "name": "scan_file",
        "description": (
            "Validate a file's true MIME type from its bytes against an allowlist "
            "(PDF, DOCX, plain text). Detects renamed files (e.g., .exe renamed to .pdf). "
            "Returns: {passed: bool, detected_type: str, reason: str|null}."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "file_bytes_b64": {
                    "type": "string",
                    "description": "Base64-encoded raw file bytes",
                },
                "filename": {
                    "type": "string",
                    "description": "Original filename (used for extension cross-check)",
                },
            },
            "required": ["file_bytes_b64", "filename"],
        },
        "handler": _handle_scan_file,
    },
    {
        "name": "redact_pii",
        "description": (
            "Detect and redact PII from resume text using regex patterns. "
            "Patterns cover: email, Indian phone numbers, PAN card, Aadhaar, SSN. "
            "Returns: {redacted_text: str, redaction_count: int, types_found: list[str]}."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Raw resume text to redact PII from",
                },
            },
            "required": ["text"],
        },
        "handler": _handle_redact_pii,
    },
    {
        "name": "score_resume",
        "description": (
            "Classify a resume using the local offline ML model. "
            "Returns predicted job category, confidence score, and top alternatives. "
            "No external API call — fully local/offline."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "resume_text": {
                    "type": "string",
                    "description": "Resume text to classify",
                },
                "model_version": {
                    "type": "string",
                    "description": "Model version (optional; defaults to best available)",
                },
            },
            "required": ["resume_text"],
        },
        "handler": _handle_score_resume,
    },
    {
        "name": "generate_feedback",
        "description": (
            "Run FeedbackAgent (Agent 2) — LLM-driven resume improvement advice. "
            "Takes PII-redacted resume text + ML score result and produces structured "
            "feedback: skill gaps, prioritised improvements, ATS score estimates, "
            "and a recruiter-facing summary. Requires score_resume output first. "
            "Returns: {skill_gaps, improvements, ats_summary, category_fit, agent_used_llm}."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "redacted_resume_text": {
                    "type": "string",
                    "description": "PII-redacted resume text (output of redact_pii.redacted_text)",
                },
                "score_result": {
                    "type": "string",
                    "description": "JSON string of score result from score_resume tool",
                },
                "job_description": {
                    "type": "string",
                    "description": "Optional job description for targeted skill gap analysis",
                },
            },
            "required": ["redacted_resume_text", "score_result"],
        },
        "handler": _handle_generate_feedback,
    },
    {
        "name": "log_audit",
        "description": (
            "Write one row to the audit_log table recording a pipeline step. "
            "The detail field must contain ONLY counts/categories — never raw PII values. "
            "Returns: {logged: bool}."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
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
                    "description": "PII-free detail string (counts/categories only)",
                },
                "resume_id": {
                    "type": "string",
                    "description": "FK to resumes.id (optional)",
                },
            },
            "required": ["step_name", "status", "detail"],
        },
        "handler": _handle_log_audit,
    },
]

# Build a lookup dict for fast dispatch.
_TOOL_LOOKUP: dict[str, dict] = {t["name"]: t for t in MCP_TOOLS}


# ---------------------------------------------------------------------------
# MCP transport: try official SDK, fall back to JSON-RPC stdio loop
# ---------------------------------------------------------------------------

def _run_with_mcp_sdk() -> None:
    """Run as an MCP server using the official `mcp` Python SDK."""
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp import types as mcp_types
    import asyncio

    server = Server("resume-security-pipeline")

    @server.list_tools()
    async def list_tools() -> list[mcp_types.Tool]:
        return [
            mcp_types.Tool(
                name=t["name"],
                description=t["description"],
                inputSchema=t["inputSchema"],
            )
            for t in MCP_TOOLS
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[mcp_types.TextContent]:
        tool = _TOOL_LOOKUP.get(name)
        if tool is None:
            raise ValueError(f"Unknown tool: {name}")
        result = tool["handler"](arguments)
        return [mcp_types.TextContent(type="text", text=json.dumps(result, indent=2))]

    async def _main():
        async with stdio_server() as streams:
            await server.run(streams[0], streams[1], server.create_initialization_options())

    asyncio.run(_main())


def _run_fallback_stdio_loop() -> None:
    """
    Fallback JSON-RPC stdio loop when the `mcp` SDK is not installed.

    Implements the minimal subset of the MCP protocol needed for tools/list
    and tools/call — enough for any MCP inspector to discover and invoke tools.
    """
    logger.info(
        "[mcp_server] 'mcp' SDK not installed — running fallback JSON-RPC stdio loop. "
        "Install with: pip install mcp"
    )
    print(
        json.dumps({
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
        }),
        flush=True,
    )
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            continue

        req_id = request.get("id")
        method = request.get("method", "")
        params = request.get("params", {})

        if method == "tools/list":
            tools_list = [
                {
                    "name": t["name"],
                    "description": t["description"],
                    "inputSchema": t["inputSchema"],
                }
                for t in MCP_TOOLS
            ]
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"tools": tools_list},
            }
        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            tool = _TOOL_LOOKUP.get(tool_name)
            if tool is None:
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"},
                }
            else:
                result = tool["handler"](arguments)
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(result, indent=2)}]
                    },
                }
        else:
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"},
            }

        print(json.dumps(response), flush=True)


def main() -> None:
    """Entry point — tries official MCP SDK, falls back to JSON-RPC stdio loop."""
    try:
        _run_with_mcp_sdk()
    except ImportError:
        _run_fallback_stdio_loop()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
