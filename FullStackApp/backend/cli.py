"""
cli.py — Command-line interface for the Resume Scanner security pipeline.

PURPOSE:
  Wraps the MCP tools as simple CLI commands so they can be tested and
  demonstrated without starting the full web server. This satisfies the
  Kaggle rubric's "Agent skills (e.g., Agents CLI)" requirement.

USAGE:
  From the FullStackApp/backend/ directory:

    python cli.py scan <filepath>
        Run the security scanner on a file and print the result.
        Example: python cli.py scan resume.pdf

    python cli.py redact <text_or_filepath>
        Run the PII redactor on text or a text file.
        Example: python cli.py redact "Contact: john@example.com +91-9876543210"
        Example: python cli.py redact resume.txt

    python cli.py score <filepath>
        Run the full orchestrator pipeline (scan + redact + score) on a file.
        Does NOT require a running web server or DB (uses console-only audit log).
        Example: python cli.py score resume.pdf

NOTES:
  - Runs without a DB connection (audit steps go to console only).
  - Model artifacts must exist in ../v5/ or ../v6/ relative to backend/.
  - python-magic / python-magic-bin must be installed for MIME detection.
"""

import argparse
import json
import os
import sys
from pathlib import Path


# Ensure the backend app/ package is on the Python path when running directly
# (e.g., python cli.py scan ... from the backend/ directory).

_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Also add the repo root so ResumeModel_v5/v6 imports work.
_REPO_ROOT = _BACKEND_DIR.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))



# Load .env so DATABASE_URL and API keys are available even in standalone mode.

try:
    from dotenv import load_dotenv
    _env_path = _BACKEND_DIR / ".env"
    if _env_path.exists():
        load_dotenv(str(_env_path))
except ImportError:
    pass  # dotenv not critical for CLI scan/redact



# Command implementations


def cmd_scan(args: argparse.Namespace) -> int:
    """Run security_scanner on a file and print JSON result."""
    from app.tools.security_scanner import scan_file

    filepath = Path(args.file)
    if not filepath.exists():
        print(f"[ERROR] File not found: {filepath}", file=sys.stderr)
        return 1
    if not filepath.is_file():
        print(f"[ERROR] Not a file: {filepath}", file=sys.stderr)
        return 1

    file_bytes = filepath.read_bytes()
    result = scan_file(file_bytes, filepath.name)

    print(json.dumps(result, indent=2))
    if result.get("passed"):
        print("\n✅  Security scan PASSED", file=sys.stderr)
        return 0
    else:
        print(f"\n❌  Security scan FAILED: {result.get('reason')}", file=sys.stderr)
        return 2


def cmd_redact(args: argparse.Namespace) -> int:
    """Run PII redactor on text or a text file and print JSON result."""
    from app.tools.pii_redactor import redact_pii

    # Determine if the argument is a file path or inline text.
    input_arg = args.text_or_file
    if os.path.exists(input_arg):
        try:
            text = Path(input_arg).read_text(encoding="utf-8", errors="replace")
        except Exception as exc:
            print(f"[ERROR] Could not read file: {exc}", file=sys.stderr)
            return 1
    else:
        text = input_arg

    result = redact_pii(text)

    # Print summary (not the full redacted text by default — it may be huge).
    summary = {
        "redaction_count": result["redaction_count"],
        "types_found": result["types_found"],
    }
    if args.show_text:
        summary["redacted_text"] = result["redacted_text"]

    print(json.dumps(summary, indent=2))
    print(
        f"\n🔒  {result['redaction_count']} PII item(s) redacted "
        f"(types: {', '.join(result['types_found']) or 'none'})",
        file=sys.stderr,
    )
    return 0


def cmd_score(args: argparse.Namespace) -> int:
    """Run the full orchestrator pipeline on a file and print JSON result."""
    from app.agents.orchestrator import run_security_pipeline

    filepath = Path(args.file)
    if not filepath.exists():
        print(f"[ERROR] File not found: {filepath}", file=sys.stderr)
        return 1
    if not filepath.is_file():
        print(f"[ERROR] Not a file: {filepath}", file=sys.stderr)
        return 1

    print(f"🔍  Running security pipeline on: {filepath.name}", file=sys.stderr)
    file_bytes = filepath.read_bytes()

    # Pass db_session=None — audit steps go to console (stderr) in CLI mode.
    result = run_security_pipeline(
        file_bytes=file_bytes,
        filename=filepath.name,
        db_session=None,
        resume_id=None,
    )

    # Pretty-print the full result.
    print(json.dumps(result, indent=2, default=str))

    # Print a human-readable summary.
    scan_icon = "✅" if result.get("scan_passed") else "❌"
    pii_count = result.get("pii_redaction_count", 0)
    score = result.get("score", {})
    category = score.get("predicted_category", "N/A")
    confidence = round(score.get("confidence_pct", 0), 1)
    pipeline_error = result.get("pipeline_error")

    print(f"\n{'='*50}", file=sys.stderr)
    print(f"{scan_icon}  File scan: {'PASSED' if result.get('scan_passed') else 'FAILED'}", file=sys.stderr)
    if result.get("scan_reason"):
        print(f"   Reason: {result['scan_reason']}", file=sys.stderr)
    print(f"🔒  PII redacted: {pii_count} item(s)", file=sys.stderr)
    if result.get("pii_types_found"):
        print(f"   Types: {', '.join(result['pii_types_found'])}", file=sys.stderr)
    if score and not score.get("error"):
        print(f"🏷️   Predicted category: {category} ({confidence}% confidence)", file=sys.stderr)
    elif score.get("error"):
        print(f"⚠️   Scoring error: {score['error']}", file=sys.stderr)
    if pipeline_error:
        print(f"❌  Pipeline error: {pipeline_error}", file=sys.stderr)
    print("="*50, file=sys.stderr)

    return 0 if result.get("scan_passed") else 2



# CLI entry point


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="cli.py",
        description="Resume Scanner Security Pipeline — CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    subparsers = parser.add_subparsers(dest="command", metavar="COMMAND")
    subparsers.required = True

    # --- scan ---
    p_scan = subparsers.add_parser(
        "scan",
        help="Validate a file's MIME type against the allowlist",
    )
    p_scan.add_argument("file", help="Path to the file to scan")
    p_scan.set_defaults(func=cmd_scan)

    # --- redact ---
    p_redact = subparsers.add_parser(
        "redact",
        help="Detect and redact PII from text or a text file",
    )
    p_redact.add_argument(
        "text_or_file",
        help="Inline text string OR path to a text file",
    )
    p_redact.add_argument(
        "--show-text",
        action="store_true",
        dest="show_text",
        help="Include the full redacted text in the JSON output",
    )
    p_redact.set_defaults(func=cmd_redact)

    # --- score ---
    p_score = subparsers.add_parser(
        "score",
        help="Run the full security pipeline (scan + redact + score) on a file",
    )
    p_score.add_argument("file", help="Path to the resume file (PDF or DOCX)")
    p_score.set_defaults(func=cmd_score)

    args = parser.parse_args()

    try:
        return args.func(args)
    except KeyboardInterrupt:
        print("\n[Interrupted]", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"[ERROR] Unhandled exception: {exc}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
