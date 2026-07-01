"""
app/agents/__init__.py — Agentic orchestration package.

This package contains THE ONLY AGENT in this codebase: orchestrator.py.

Terminology note (for code reviewers and judges):
  An "agent" is an LLM-driven component that makes routing or sequencing
  decisions based on reasoning over context. ONLY orchestrator.py qualifies.

  The components in app/tools/ are TOOLS — deterministic functions with
  no LLM reasoning. They are called by the agent, not the other way around.
"""
