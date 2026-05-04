import pytest
from app.services.ats_checker import ats_checker_service

def test_good_resume_passes(sample_resume_text):
    # This resume should pass basic checks
    # (has contact info, section headers, appropriate length, no tables)
    # Wait, the sample text has length < 400 words, so it might fail length check.
    # Let's add more text to the sample or create a new clean one.
    clean_text = sample_resume_text + (" word" * 400)
    result = ats_checker_service.check(clean_text)
    assert result["ats_score"] >= 70
    assert result["passed"] is True

def test_no_contact_fails():
    text = "John Doe\n\nExperience\nSoftware Engineer\nEducation\nBSc CS\nSkills\nPython\n" + (" word" * 400)
    result = ats_checker_service.check(text)
    issue_ids = [issue["severity"] for issue in result["issues"]]
    # The checker uses messages to identify issues, we check if contact_not_at_top was flagged (medium severity)
    assert "medium" in issue_ids
    assert any("Contact information not found" in issue["issue"] for issue in result["issues"])

def test_missing_headers_detected():
    text = "John Doe\njohn@example.com\n\nI worked at a company doing Python things." + (" word" * 400)
    result = ats_checker_service.check(text)
    assert any("Standard section headers missing" in issue["issue"] for issue in result["issues"])

def test_score_calculation():
    # Force 2 high issues (table + multiple columns)
    # Tables: |---|
    # Columns: large gap
    text = """John Doe
john@example.com | +91 9876543210

Experience                  Education
Software Engineer           BSc CS
|---|
| skill | level |
|---|
""" + (" word" * 400)
    
    result = ats_checker_service.check(text)
    
    # 2 high issues = 30 penalty. Score should be <= 70
    assert result["ats_score"] <= 70
