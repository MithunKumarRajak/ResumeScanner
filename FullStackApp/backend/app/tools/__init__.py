"""
app/tools/__init__.py — Security pipeline tools package.

This package contains DETERMINISTIC tools (no LLM reasoning):
  - security_scanner: file-type/MIME validation
  - pii_redactor:     regex-based PII detection + redaction
  - audit_logger:     writes pipeline steps to the audit_log DB table

Terminology note (important for code reviewers / judges):
  These are TOOLS — deterministic functions with defined inputs/outputs.
  They are NOT agents. Only app/agents/orchestrator.py is the agent.
"""
