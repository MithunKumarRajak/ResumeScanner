"""
cli_agent.py — Agents CLI for the ResumeScanner multi-agent system.

===========================================================================
PURPOSE:
===========================================================================
  This CLI directly demonstrates the "Agent skills (e.g., Agents CLI)"
  criterion from the Kaggle AI Agents Capstone rubric.

  It provides a command-line interface to:
    - List all registered agent skills
    - Run any skill individually with structured output
    - Run the full multi-agent pipeline end-to-end
    - Show architecture information about the agent system

===========================================================================
USAGE:
===========================================================================
  From the backend directory (activate venv first if not using Docker):

    cd FullStackApp/backend

    # List all registered skills
    python cli_agent.py list-skills

    # Show detailed info about a specific skill
    python cli_agent.py describe SkillScanFile

    # Run SkillScanFile on a file
    python cli_agent.py run SkillScanFile --file path/to/resume.pdf

    # Run SkillRedactPII on inline text
    python cli_agent.py run SkillRedactPII --text "Contact: john@example.com"

    # Run SkillScoreResume on a text file
    python cli_agent.py run SkillScoreResume --file path/to/resume.txt

    # Run the full multi-agent pipeline (scan → redact → score → feedback)
    python cli_agent.py run-pipeline path/to/resume.pdf

    # Run the full pipeline with a job description for targeted feedback
    python cli_agent.py run-pipeline path/to/resume.pdf --jd path/to/jd.txt

    # Show agent system architecture
    python cli_agent.py architecture

===========================================================================
DESIGN:
===========================================================================
  This CLI does not start a web server. It exercises the full multi-agent
  pipeline from the command line, making it ideal for:
    - Local development and testing without Docker
    - CI/CD validation of the agent pipeline
    - Video demos for the Kaggle submission
    - MCP inspector integration testing
===========================================================================
"""

import argparse
import json
import os
import sys
import textwrap
import time
from typing import Optional

# ---------------------------------------------------------------------------
# ANSI color helpers (no third-party deps required)
# ---------------------------------------------------------------------------

class C:
    """Terminal color codes — cross-platform (auto-disabled if not a TTY)."""
    _enabled = hasattr(sys.stdout, "isatty") and sys.stdout.isatty()

    @staticmethod
    def _wrap(code: str, text: str) -> str:
        if C._enabled:
            return f"\033[{code}m{text}\033[0m"
        return text

    green   = staticmethod(lambda t: C._wrap("92", t))
    yellow  = staticmethod(lambda t: C._wrap("93", t))
    red     = staticmethod(lambda t: C._wrap("91", t))
    cyan    = staticmethod(lambda t: C._wrap("96", t))
    bold    = staticmethod(lambda t: C._wrap("1",  t))
    dim     = staticmethod(lambda t: C._wrap("2",  t))
    magenta = staticmethod(lambda t: C._wrap("95", t))


# Emoji-based step icons (fallback to ASCII on Windows if needed)
ICON_OK    = "✅"
ICON_LOCK  = "🔒"
ICON_ROBOT = "🤖"
ICON_SCORE = "🎯"
ICON_BRAIN = "💡"
ICON_WARN  = "⚠️ "
ICON_ERR   = "❌"
ICON_LIST  = "📋"
ICON_ARCH  = "🏗️"
ICON_TIME  = "⏱️"


def _print_header(title: str) -> None:
    width = 60
    print()
    print(C.bold("=" * width))
    print(C.bold(f"  {title}"))
    print(C.bold("=" * width))


def _print_json(data: dict) -> None:
    print(C.dim(json.dumps(data, indent=2, default=str)))


def _print_step(icon: str, label: str, value: str = "", color=None) -> None:
    color = color or (lambda x: x)
    line = f"  {icon}  {label}"
    if value:
        line += f": {color(value)}"
    print(line)


# ---------------------------------------------------------------------------
# Command: list-skills
# ---------------------------------------------------------------------------

def cmd_list_skills(_args) -> int:
    """List all registered agent skills with their categories and descriptions."""
    _setup_django_path()
    from app.agents.agent_skills import SKILL_REGISTRY

    skills = SKILL_REGISTRY.list_skills()

    _print_header(f"Agent Skills Registry  ({len(skills)} skills)")

    categories: dict[str, list] = {}
    for skill in skills:
        categories.setdefault(skill.category, []).append(skill)

    for category, cat_skills in sorted(categories.items()):
        print(f"\n  {C.cyan(C.bold(category))}")
        for skill in cat_skills:
            llm_tag = C.yellow(" [LLM]") if skill.requires_llm else ""
            db_tag  = C.dim(" [DB]")  if skill.requires_db  else ""
            print(f"    {C.bold(skill.name)}{llm_tag}{db_tag}")
            # Wrap description to 56 chars
            wrapped = textwrap.fill(skill.description, width=56, initial_indent="      ", subsequent_indent="      ")
            print(C.dim(wrapped))

    print(f"\n  {C.dim('[LLM] = makes LLM API calls   [DB] = requires database')}")
    print()
    return 0


# ---------------------------------------------------------------------------
# Command: describe
# ---------------------------------------------------------------------------

def cmd_describe(args) -> int:
    """Show detailed info about a specific skill."""
    _setup_django_path()
    from app.agents.agent_skills import SKILL_REGISTRY

    skill = SKILL_REGISTRY.get(args.skill_name)
    if skill is None:
        print(f"{ICON_ERR}  Skill not found: '{args.skill_name}'")
        print(f"  Available: {[s.name for s in SKILL_REGISTRY.list_skills()]}")
        return 1

    _print_header(f"Skill: {skill.name}")
    print(f"\n  Category:    {C.cyan(skill.category)}")
    print(f"  Requires LLM: {C.yellow('Yes') if skill.requires_llm else C.dim('No')}")
    print(f"  Requires DB:  {C.yellow('Yes') if skill.requires_db  else C.dim('No')}")
    print(f"\n  Description:")
    wrapped = textwrap.fill(skill.description, width=56, initial_indent="    ", subsequent_indent="    ")
    print(wrapped)

    print(f"\n  Input Schema:")
    for param, spec in skill.input_schema.items():
        print(f"    {C.bold(param)} ({spec.get('type', 'any')}): {spec.get('description', '')}")

    if skill.examples:
        print(f"\n  Example:")
        _print_json(skill.examples[0])

    print()
    return 0


# ---------------------------------------------------------------------------
# Command: run
# ---------------------------------------------------------------------------

def cmd_run(args) -> int:
    """Run a single skill by name."""
    _setup_django_path()
    from app.agents.agent_skills import SKILL_REGISTRY

    skill_name = args.skill_name
    skill = SKILL_REGISTRY.get(skill_name)
    if skill is None:
        print(f"{ICON_ERR}  Skill not found: '{skill_name}'")
        print(f"  Available: {[s.name for s in SKILL_REGISTRY.list_skills()]}")
        return 1

    # Build params dict from CLI arguments.
    params: dict = {}

    if args.file:
        if not os.path.exists(args.file):
            print(f"{ICON_ERR}  File not found: {args.file}")
            return 1
        if skill_name == "SkillScanFile":
            params["file_path"] = args.file
            params["filename"] = os.path.basename(args.file)
        elif skill_name in ("SkillScoreResume", "SkillGenerateFeedback"):
            with open(args.file, "r", encoding="utf-8", errors="replace") as f:
                params["resume_text"] = f.read()
        else:
            with open(args.file, "r", encoding="utf-8", errors="replace") as f:
                params["text"] = f.read()

    if args.text:
        if skill_name == "SkillRedactPII":
            params["text"] = args.text
        elif skill_name in ("SkillScoreResume", "SkillGenerateFeedback"):
            params["resume_text"] = args.text
        else:
            params["text"] = args.text

    if args.json_params:
        try:
            extra = json.loads(args.json_params)
            params.update(extra)
        except json.JSONDecodeError as e:
            print(f"{ICON_ERR}  Invalid --json-params: {e}")
            return 1

    if not params:
        print(f"{ICON_WARN}  No parameters provided. Use --file, --text, or --json-params.")
        print(f"  Input schema: {list(skill.input_schema.keys())}")
        return 1

    _print_header(f"Running {skill_name}")
    print(f"  Params: {C.dim(json.dumps({k: str(v)[:60] for k, v in params.items()}))}\n")

    t0 = time.perf_counter()
    result = SKILL_REGISTRY.invoke(skill_name, params)
    elapsed = time.perf_counter() - t0

    print(f"  {ICON_TIME}  Completed in {elapsed:.2f}s\n")
    print(f"  Result:")
    _print_json(result)

    # Error check
    if result.get("error"):
        print(f"\n  {ICON_ERR}  {C.red(result['error'])}")
        return 1

    print()
    return 0


# ---------------------------------------------------------------------------
# Command: run-pipeline (full multi-agent pipeline)
# ---------------------------------------------------------------------------

def cmd_run_pipeline(args) -> int:
    """
    Run the full multi-agent pipeline end-to-end on a resume file.

    Pipeline:
      Agent 1 — SecurityOrchestratorAgent:
        Step 1: SkillScanFile       — MIME validation
        Step 2: SkillRedactPII      — PII detection + redaction
        Step 3: SkillScoreResume    — Local ML classification
      Agent 2 — FeedbackAgent:
        Step 4: SkillGenerateFeedback — LLM reasoning + improvement advice
    """
    _setup_django_path()
    from app.agents.agent_skills import SKILL_REGISTRY

    file_path = args.file
    if not os.path.exists(file_path):
        print(f"{ICON_ERR}  File not found: {file_path}")
        return 1

    jd_text: Optional[str] = None
    if args.jd:
        if not os.path.exists(args.jd):
            print(f"{ICON_ERR}  JD file not found: {args.jd}")
            return 1
        with open(args.jd, "r", encoding="utf-8", errors="replace") as f:
            jd_text = f.read()

    filename = os.path.basename(file_path)
    _print_header(f"Multi-Agent Pipeline  ·  {filename}")
    print()

    pipeline_start = time.perf_counter()

    # -----------------------------------------------------------------------
    # AGENT 1 — SecurityOrchestratorAgent
    # -----------------------------------------------------------------------
    print(f"  {C.bold(C.cyan('AGENT 1  —  SecurityOrchestratorAgent'))}")
    print(f"  {C.dim('Role: security validation, PII protection, ML classification')}\n")

    # --- Step 1: Scan file ---
    print(f"  {ICON_OK}  Step 1 — {C.bold('SkillScanFile')}  {C.dim('(MIME validation)')}")
    t = time.perf_counter()
    scan_result = SKILL_REGISTRY.invoke("SkillScanFile", {
        "file_path": file_path,
        "filename": filename,
    })
    print(f"     Detected type: {C.cyan(scan_result.get('detected_type', 'unknown'))}")
    print(f"     Scan passed:   {C.green('YES') if scan_result.get('passed') else C.red('NO')}")
    if not scan_result.get("passed"):
        print(f"     {ICON_ERR}  Reason: {C.red(scan_result.get('reason', 'unknown'))}")
        print(f"\n  {C.red('Pipeline halted — file rejected by security scan.')}")
        return 1
    print(f"     {C.dim(f'({time.perf_counter()-t:.2f}s)')}\n")

    # Read file text for subsequent steps.
    ext = os.path.splitext(filename)[1].lower()
    raw_text = _extract_text(file_path, ext)
    if not raw_text:
        print(f"  {ICON_ERR}  Could not extract text from file (image-only or blank).")
        return 1

    # --- Step 2: Redact PII ---
    print(f"  {ICON_LOCK}  Step 2 — {C.bold('SkillRedactPII')}  {C.dim('(PII detection + redaction)')}")
    t = time.perf_counter()
    redact_result = SKILL_REGISTRY.invoke("SkillRedactPII", {"text": raw_text})
    redacted_text = redact_result.get("redacted_text", raw_text)
    count = redact_result.get("redaction_count", 0)
    types = ", ".join(redact_result.get("types_found", [])) or "none"
    if count > 0:
        print(f"     {C.yellow(f'{count} PII item(s) redacted')}: {types}")
    else:
        print(f"     {C.green('No PII found')} in resume text")
    print(f"     {C.dim('LLM payloads will use redacted text only — PII stays local.')}")
    print(f"     {C.dim(f'({time.perf_counter()-t:.2f}s)')}\n")

    # --- Step 3: Score resume ---
    print(f"  {ICON_SCORE}  Step 3 — {C.bold('SkillScoreResume')}  {C.dim('(local ML classification, offline)')}")
    t = time.perf_counter()
    score_result = SKILL_REGISTRY.invoke("SkillScoreResume", {"resume_text": raw_text})
    category = score_result.get("predicted_category", "Unknown")
    confidence = score_result.get("confidence", 0.0)
    print(f"     Category:   {C.cyan(category)}")
    print(f"     Confidence: {C.bold(f'{confidence:.1%}')}")
    top = score_result.get("top_categories", [])
    if top:
        top_str = " | ".join([f"{c['category']} ({c['confidence']:.0%})" for c in top[:3]])
        print(f"     Top 3:      {C.dim(top_str)}")
    if score_result.get("error"):
        print(f"     {ICON_WARN}  {C.yellow(score_result['error'])}")
    print(f"     {C.dim(f'({time.perf_counter()-t:.2f}s)')}\n")

    # -----------------------------------------------------------------------
    # AGENT 2 — FeedbackAgent
    # -----------------------------------------------------------------------
    print(f"  {C.bold(C.magenta('AGENT 2  —  FeedbackAgent'))}")
    print(f"  {C.dim('Role: LLM-driven resume feedback + improvement prioritization')}\n")

    print(f"  {ICON_BRAIN}  Step 4 — {C.bold('SkillGenerateFeedback')}  {C.dim('(LLM reasoning)')}")
    if jd_text:
        print(f"     Using JD: {C.dim(args.jd)}")
    else:
        print(f"     {C.dim('No JD provided — using predicted category for gap analysis.')}")

    t = time.perf_counter()
    feedback_result = SKILL_REGISTRY.invoke("SkillGenerateFeedback", {
        "redacted_resume_text": redacted_text,
        "score_result": score_result,
        "job_description": jd_text,
    })
    used_llm = feedback_result.get("agent_used_llm", False)
    llm_tag = C.cyan("Gemini/Groq") if used_llm else C.yellow("rule-based fallback")
    print(f"     LLM source:    {llm_tag}")
    print(f"     Category fit:  {C.bold(feedback_result.get('category_fit', 'Unknown'))}")
    print(f"     {C.dim(f'({time.perf_counter()-t:.2f}s)')}\n")

    # -----------------------------------------------------------------------
    # Final report
    # -----------------------------------------------------------------------
    total_elapsed = time.perf_counter() - pipeline_start
    print(C.bold("=" * 60))
    print(C.bold("  Pipeline Complete"))
    print(C.bold("=" * 60))
    print()
    print(f"  {ICON_OK}  Security scan:   {C.green('PASSED')}  ({scan_result.get('detected_type')})")
    pii_str = f"{count} item(s) — {types}" if count > 0 else "none detected"
    print(f"  {ICON_LOCK}  PII redacted:    {C.yellow(pii_str) if count else C.green(pii_str)}")
    print(f"  {ICON_SCORE}  ML Category:     {C.cyan(category)} ({confidence:.1%} confidence)")
    print(f"  {ICON_BRAIN}  Category fit:    {C.bold(feedback_result.get('category_fit', 'Unknown'))}")
    print()

    # Skill gaps
    gaps = feedback_result.get("skill_gaps", [])
    if gaps:
        print(f"  Top Skill Gaps:")
        for gap in gaps:
            print(f"    • {C.yellow(gap)}")
        print()

    # Improvements
    improvements = feedback_result.get("improvements", [])
    if improvements:
        print(f"  Priority Improvements:")
        for imp in improvements:
            impact = imp.get("impact", "")
            boost = imp.get("ats_score_boost", 0)
            action = imp.get("action", "")
            impact_color = C.red if impact == "High" else C.yellow if impact == "Medium" else C.dim
            boost_str = f"+{boost} ATS pts" if boost else ""
            print(f"    [{impact_color(impact)}] {action}")
            if boost_str:
                print(f"          {C.dim(boost_str)}")
        print()

    # ATS summary
    summary = feedback_result.get("ats_summary", "")
    if summary:
        print(f"  Recruiter Summary:")
        wrapped = textwrap.fill(summary, width=56, initial_indent="    ", subsequent_indent="    ")
        print(C.dim(wrapped))
        print()

    print(f"  {ICON_TIME}  Total pipeline time: {total_elapsed:.2f}s")
    print()
    return 0


# ---------------------------------------------------------------------------
# Command: architecture
# ---------------------------------------------------------------------------

def cmd_architecture(_args) -> int:
    """Display the multi-agent system architecture diagram."""
    _print_header("Multi-Agent System Architecture")
    arch = """
  Upload Request
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  AGENT 1 — SecurityOrchestratorAgent        │
  │  (app/agents/orchestrator.py)               │
  │                                             │
  │  Step 1: SkillScanFile                      │
  │          ↓ magic-byte MIME validation        │
  │          FAIL → HTTP 400 (pipeline halted)  │
  │          PASS ↓                             │
  │  Step 2: SkillRedactPII                     │
  │          ↓ regex strips email/phone/PAN     │
  │          (ALWAYS runs — hardcoded, no LLM)  │
  │          ↓                                  │
  │  Step 3: SkillScoreResume  ← LLM decides   │
  │          ↓ local ML classifier (offline)    │
  │          no PII risk — no API call          │
  └──────────────┬──────────────────────────────┘
                 │  score_result (category, confidence)
                 ▼
  ┌─────────────────────────────────────────────┐
  │  AGENT 2 — FeedbackAgent                    │
  │  (app/agents/feedback_agent.py)             │
  │                                             │
  │  Input: redacted_text + score_result        │
  │  Tool: Gemini / Groq (redacted text only)   │
  │                                             │
  │  Outputs:                                   │
  │    • skill_gaps       (top 3-5 gaps)        │
  │    • improvements     (prioritized actions) │
  │    • category_fit     (Strong/Good/Moderate)│
  │    • ats_summary      (recruiter headline)  │
  └──────────────┬──────────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────────┐
  │  Outputs                                    │
  │    • PostgreSQL audit_log (immutable trail) │
  │    • FastAPI REST API response              │
  │    • React frontend UI                      │
  │    • MCP tools (external agent access)      │
  └─────────────────────────────────────────────┘

  MCP Server (app/mcp_server.py):
    Exposes all 5 skills as MCP tools over stdio transport.
    Tools: scan_file, redact_pii, score_resume, generate_feedback, log_audit
    MCP-aware clients (Claude Desktop, ADK agents) can discover
    and invoke any tool via the standard MCP protocol.
    Run: python -m app.mcp_server
    Inspector: npx @modelcontextprotocol/inspector python -m app.mcp_server

  Agent Skills CLI (this file):
    Direct CLI access to any skill without a web server.
    Used for testing, demos, and CI/CD validation.
"""
    print(arch)
    print(C.dim("  Files:"))
    print(C.dim("    orchestrator.py    — Agent 1 (security + scoring)"))
    print(C.dim("    feedback_agent.py  — Agent 2 (LLM feedback)"))
    print(C.dim("    agent_skills.py    — ADK skill registry (5 skills)"))
    print(C.dim("    mcp_server.py      — MCP transport layer"))
    print(C.dim("    cli_agent.py       — This agents CLI"))
    print()
    return 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _setup_django_path() -> None:
    """Add the backend directory to sys.path so app imports work from CLI."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    # Load .env so API keys are available for LLM skills
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(backend_dir, ".env")
        if os.path.exists(env_path):
            load_dotenv(env_path)
    except ImportError:
        pass  # dotenv not installed — env vars must be set manually


def _extract_text(file_path: str, ext: str) -> Optional[str]:
    """Extract text from a PDF or DOCX file using the parser service."""
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        from app.services import parser as parser_svc
        return parser_svc.extract_text(file_path)
    except Exception:
        pass

    # Plain text fallback
    if ext in (".txt", ".md"):
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        except Exception:
            pass

    return None


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cli_agent",
        description=C.bold("ResumeScanner — Agent Skills CLI"),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              python cli_agent.py list-skills
              python cli_agent.py describe SkillScanFile
              python cli_agent.py run SkillScanFile --file resume.pdf
              python cli_agent.py run SkillRedactPII --text "john@example.com"
              python cli_agent.py run-pipeline resume.pdf
              python cli_agent.py run-pipeline resume.pdf --jd job_desc.txt
              python cli_agent.py architecture
        """),
    )

    subparsers = parser.add_subparsers(dest="command", metavar="COMMAND")
    subparsers.required = True

    # list-skills
    subparsers.add_parser(
        "list-skills",
        help="List all registered agent skills",
    )

    # describe
    desc_p = subparsers.add_parser(
        "describe",
        help="Show detailed info about a skill",
    )
    desc_p.add_argument("skill_name", help="Name of the skill (e.g., SkillScanFile)")

    # run
    run_p = subparsers.add_parser(
        "run",
        help="Run a single skill",
    )
    run_p.add_argument("skill_name", help="Name of the skill to run")
    run_p.add_argument("--file",        metavar="PATH", help="Input file path")
    run_p.add_argument("--text",        metavar="TEXT", help="Inline input text")
    run_p.add_argument("--json-params", metavar="JSON", help="Raw JSON params dict")

    # run-pipeline
    pipe_p = subparsers.add_parser(
        "run-pipeline",
        help="Run the full multi-agent pipeline on a resume file",
    )
    pipe_p.add_argument("file", help="Path to the resume file (PDF or DOCX)")
    pipe_p.add_argument("--jd", metavar="PATH", help="Path to job description text file")

    # architecture
    subparsers.add_parser(
        "architecture",
        help="Display the multi-agent system architecture diagram",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    dispatch = {
        "list-skills":  cmd_list_skills,
        "describe":     cmd_describe,
        "run":          cmd_run,
        "run-pipeline": cmd_run_pipeline,
        "architecture": cmd_architecture,
    }

    handler = dispatch.get(args.command)
    if handler is None:
        parser.print_help()
        return 1

    return handler(args)


if __name__ == "__main__":
    sys.exit(main())
