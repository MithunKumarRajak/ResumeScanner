import pytest
from app.services.classifier import compute_match_score

def test_score_range():
    resume_text = "Experienced software engineer working with Python and React."
    jd_text = "Looking for a software engineer with Python and React experience."
    score = compute_match_score(resume_text, jd_text)
    assert 0 <= score <= 100

def test_keyword_match():
    jd_text = "Looking for Python"
    resume_text = "I know Python"
    score = compute_match_score(resume_text, jd_text)
    assert score > 0

def test_no_match():
    jd_text = "Looking for Java and Spring Boot experience."
    resume_text = "I know Python and Django."
    score = compute_match_score(resume_text, jd_text)
    assert score < 50
