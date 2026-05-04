import pytest
from app.services.parser import parse_resume

def test_extract_email():
    text = "John Doe\njohn@example.com\n+91 9876543210"
    result = parse_resume(text)
    assert result.get("email") == "john@example.com"

def test_extract_phone():
    text = "John Doe\njohn@example.com\n+91 9876543210"
    result = parse_resume(text)
    assert result.get("phone") == "+91 9876543210"

def test_extract_skills():
    text = "I have experience with Python, React, PostgreSQL and AWS."
    result = parse_resume(text)
    skills = result.get("skills", [])
    # Check that Python, React, PostgreSQL are in skills (case-insensitive checking might be needed based on implementation, 
    # but exact case if it preserves it, or lower if not)
    # The actual parser extracts predefined skills. Let's convert to lowercase for robust assertion.
    skills_lower = [s.lower() for s in skills]
    assert "python" in skills_lower
    assert "react" in skills_lower
    assert "postgresql" in skills_lower

def test_empty_text():
    result = parse_resume("")
    assert isinstance(result, dict)
    assert result.get("name") in [None, ""]
    assert result.get("email") in [None, ""]
    assert result.get("phone") in [None, ""]
    assert result.get("skills") == []
