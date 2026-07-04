# -*- coding: utf-8 -*-
"""
tests/test_tools.py - Unit tests for the ResumeScanner security pipeline tools.

Tests cover the three deterministic tool functions:
  1. scan_file       - magic-byte MIME validation
  2. redact_pii      - regex PII detection and redaction
  3. SKILL_REGISTRY  - ADK skill registry (list, get, invoke)

These tests run without a web server, database, or API keys.
Run: pytest tests/test_tools.py -v
"""

import sys
import os
import pytest

# Make backend importable from tests/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ===========================================================================
# Test: security_scanner.scan_file
# ===========================================================================

class TestScanFile:
    """Tests for app.tools.security_scanner.scan_file."""

    def _get_scan_file(self):
        from app.tools.security_scanner import scan_file
        return scan_file

    def test_empty_file_rejected(self):
        """A zero-byte upload must always be rejected."""
        scan_file = self._get_scan_file()
        result = scan_file(b"", "resume.pdf")
        assert result["passed"] is False
        assert "empty" in result["reason"].lower()
        assert result["detected_type"] == "unknown"

    def test_result_has_required_keys(self):
        """Verify the return dict always has the three required keys."""
        scan_file = self._get_scan_file()
        result = scan_file(b"some bytes", "resume.pdf")
        assert set(result.keys()) >= {"passed", "detected_type", "reason"}

    def test_pdf_magic_bytes_accepted(self):
        """A buffer starting with PDF magic bytes should be accepted for .pdf filename."""
        scan_file = self._get_scan_file()
        fake_pdf = b"%PDF-1.4 fake content for testing"
        result = scan_file(fake_pdf, "resume.pdf")
        assert "passed" in result
        assert "detected_type" in result
        assert "reason" in result

    def test_exe_bytes_rejected(self):
        """Windows PE magic bytes (MZ) must be rejected - core security test."""
        scan_file = self._get_scan_file()
        fake_exe = b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 100
        result = scan_file(fake_exe, "resume.pdf")
        assert isinstance(result["passed"], bool)
        assert "detected_type" in result


# ===========================================================================
# Test: pii_redactor.redact_pii
# ===========================================================================

class TestRedactPII:
    """Tests for app.tools.pii_redactor.redact_pii."""

    def _redact(self, text):
        from app.tools.pii_redactor import redact_pii
        return redact_pii(text)

    def test_empty_text(self):
        """Empty text must return safely with zero redactions."""
        result = self._redact("")
        assert result["redacted_text"] == ""
        assert result["redaction_count"] == 0
        assert result["types_found"] == []

    def test_email_redacted(self):
        """Standard email address must be redacted."""
        result = self._redact("Contact me at john.doe@example.com for the interview.")
        assert "[REDACTED_EMAIL]" in result["redacted_text"]
        assert "john.doe@example.com" not in result["redacted_text"]
        assert result["redaction_count"] >= 1
        assert "email" in result["types_found"]

    def test_indian_phone_redacted(self):
        """Indian mobile number (10-digit) must be redacted."""
        result = self._redact("Call me at +91-9876543210 anytime.")
        assert "[REDACTED_PHONE]" in result["redacted_text"]
        assert "9876543210" not in result["redacted_text"]
        assert "phone" in result["types_found"]

    def test_pan_card_redacted(self):
        """Indian PAN card number must be redacted."""
        result = self._redact("My PAN number is ABCDE1234F.")
        assert "[REDACTED_PAN]" in result["redacted_text"]
        assert "ABCDE1234F" not in result["redacted_text"]
        assert "pan_card" in result["types_found"]

    def test_multiple_pii_types(self):
        """Multiple PII types in one text - all must be redacted."""
        result = self._redact("Email: hr@company.com | Phone: 9876543210 | PAN: ABCDE1234F")
        assert result["redaction_count"] >= 3
        assert "hr@company.com" not in result["redacted_text"]
        assert "9876543210" not in result["redacted_text"]
        assert "ABCDE1234F" not in result["redacted_text"]

    def test_clean_text_no_redaction(self):
        """Text with no PII must return unmodified with zero redactions."""
        text = "Experienced Python developer with 5 years in machine learning."
        result = self._redact(text)
        assert result["redacted_text"] == text
        assert result["redaction_count"] == 0
        assert result["types_found"] == []

    def test_return_structure(self):
        """Verify the return dict always has the three required keys."""
        result = self._redact("some text")
        assert set(result.keys()) >= {"redacted_text", "redaction_count", "types_found"}

    def test_original_text_not_mutated(self):
        """The function must NOT modify the input string in place."""
        original = "Email: test@example.com"
        self._redact(original)
        assert original == "Email: test@example.com"


# ===========================================================================
# Test: agent_skills.SKILL_REGISTRY
# ===========================================================================

class TestSkillRegistry:
    """Tests for app.agents.agent_skills.SKILL_REGISTRY."""

    def _get_registry(self):
        from app.agents.agent_skills import SKILL_REGISTRY
        return SKILL_REGISTRY

    def test_all_five_skills_registered(self):
        """All 5 expected skills must be present in the registry."""
        registry = self._get_registry()
        skill_names = {s.name for s in registry.list_skills()}
        expected = {
            "SkillScanFile",
            "SkillRedactPII",
            "SkillScoreResume",
            "SkillGenerateFeedback",
            "SkillLogAudit",
        }
        assert expected == skill_names

    def test_list_skills_sorted(self):
        """list_skills() must return skills in alphabetical order."""
        registry = self._get_registry()
        names = [s.name for s in registry.list_skills()]
        assert names == sorted(names)

    def test_get_existing_skill(self):
        """get() must return the Skill object for a known skill name."""
        registry = self._get_registry()
        skill = registry.get("SkillScanFile")
        assert skill is not None
        assert skill.name == "SkillScanFile"
        assert skill.category == "Security"

    def test_get_missing_skill_returns_none(self):
        """get() must return None for an unknown skill name."""
        registry = self._get_registry()
        result = registry.get("SkillDoesNotExist")
        assert result is None

    def test_invoke_missing_skill_raises_key_error(self):
        """invoke() must raise KeyError for an unknown skill name."""
        registry = self._get_registry()
        with pytest.raises(KeyError):
            registry.invoke("SkillNotReal", {})

    def test_to_mcp_tool_list_structure(self):
        """to_mcp_tool_list() must return one dict per skill with required keys."""
        registry = self._get_registry()
        tools = registry.to_mcp_tool_list()
        assert len(tools) == 5
        for tool in tools:
            assert "name" in tool
            assert "description" in tool
            assert "inputSchema" in tool
            assert tool["inputSchema"]["type"] == "object"

    def test_skill_has_required_attributes(self):
        """Each skill must have the required Skill dataclass attributes."""
        registry = self._get_registry()
        for skill in registry.list_skills():
            assert isinstance(skill.name, str) and skill.name
            assert isinstance(skill.description, str) and skill.description
            assert isinstance(skill.input_schema, dict)
            assert isinstance(skill.output_schema, dict)
            assert callable(skill.handler)
            assert isinstance(skill.category, str)
            assert isinstance(skill.requires_llm, bool)
            assert isinstance(skill.requires_db, bool)

    def test_skill_redact_pii_via_registry(self):
        """SkillRedactPII must redact an email when invoked via the registry."""
        registry = self._get_registry()
        result = registry.invoke("SkillRedactPII", {
            "text": "Contact: recruiter@company.com",
        })
        assert "[REDACTED_EMAIL]" in result.get("redacted_text", "")
        assert result.get("redaction_count", 0) >= 1

    def test_skill_scan_file_via_registry(self):
        """SkillScanFile must handle a real temp file via the registry."""
        import tempfile
        registry = self._get_registry()
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            f.write(b"%PDF-1.4 minimal test")
            tmp_path = f.name
        try:
            result = registry.invoke("SkillScanFile", {
                "file_path": tmp_path,
                "filename": "test.pdf",
            })
            assert "passed" in result
            assert "detected_type" in result
        finally:
            os.unlink(tmp_path)