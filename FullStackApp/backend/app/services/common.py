"""
Shared text processing, skill queries, and email templates.

This module consolidates duplicated logic that was previously scattered
across predict.py, classifier.py, matcher.py, dashboard.py, resume.py,
email_service.py, and notifications.py.
"""
import re
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════
#  TEXT PREPROCESSING
# ═══════════════════════════════════════════════

def clean_text(text: str) -> str:
    """Strip URLs, mentions, HTML tags, and non-alpha characters."""
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text, flags=re.MULTILINE)
    text = re.sub(r"\bRT\b|\bcc\b", " ", text)
    text = re.sub(r"#\S+", " ", text)
    text = re.sub(r"@\S+", " ", text)
    text = re.sub(r"<.*?>", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def preprocess_text(text: str, nlp=None) -> str:
    """Clean + lemmatise text.  If *nlp* (spaCy model) is provided, uses
    it for lemmatisation and stop-word removal."""
    cleaned = clean_text(text)
    if nlp is None:
        return cleaned.lower()
    doc = nlp(cleaned.lower())
    return " ".join(token.lemma_ for token in doc if not token.is_stop)


def get_top_tfidf_terms(tfidf_vector, vectorizer, n: int = 10) -> list:
    """Return the *n* highest-scoring TF-IDF terms from a sparse vector."""
    import numpy as np
    feature_names = vectorizer.get_feature_names_out()
    scores = tfidf_vector.toarray().flatten()
    sorted_indices = np.argsort(scores)[::-1][:n]
    return [feature_names[i] for i in sorted_indices if scores[i] > 0]


# ═══════════════════════════════════════════════
#  SKILL NAME QUERIES
# ═══════════════════════════════════════════════

def resume_skill_names(db, resume_id: str) -> List[str]:
    """Fetch skill names for a resume (used by dashboard, resume, compare)."""
    from app.models.skill import Skill, ResumeSkill
    rows = (
        db.query(Skill.name)
        .join(ResumeSkill, ResumeSkill.skill_id == Skill.id)
        .filter(ResumeSkill.resume_id == resume_id)
        .all()
    )
    return [r.name for r in rows]


def job_skill_names(db, job_id: str) -> List[str]:
    """Fetch skill names for a job posting."""
    from app.models.skill import Skill, JobSkill
    rows = (
        db.query(Skill.name)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .filter(JobSkill.job_id == job_id)
        .all()
    )
    return [r.name for r in rows]


# ═══════════════════════════════════════════════
#  EMAIL TEMPLATES  (single source of truth)
# ═══════════════════════════════════════════════

EMAIL_TEMPLATES = {
    "shortlisted": {
        "subject": "Congratulations! You've been shortlisted — {job_title}",
        "body": """<html><body style="font-family:Arial,sans-serif;color:#333">
<h2 style="color:#16a34a">Congratulations, {name}! 🎉</h2>
<p>We're pleased to inform you that you have been <strong>shortlisted</strong>
for the <strong>{job_title}</strong> position.</p>
<p>Our team was impressed with your profile and we'd like to move forward
with the next steps in our hiring process.</p>
<p>We'll be in touch shortly with more details. In the meantime, please
don't hesitate to reach out if you have any questions.</p>
<p style="margin-top:24px">Best regards,<br><em>The Hiring Team</em></p>
</body></html>""",
    },
    "rejected": {
        "subject": "Application Update — {job_title}",
        "body": """<html><body style="font-family:Arial,sans-serif;color:#333">
<h2>Dear {name},</h2>
<p>Thank you for your interest in the <strong>{job_title}</strong> position
and for taking the time to apply.</p>
<p>After careful consideration, we have decided to move forward with other
candidates whose qualifications more closely match our current needs.</p>
<p>We encourage you to apply for future openings that match your skill set.
We wish you all the best in your career journey.</p>
<p style="margin-top:24px">Warm regards,<br><em>The Hiring Team</em></p>
</body></html>""",
    },
    "on_hold": {
        "subject": "Your Application is Under Review — {job_title}",
        "body": """<html><body style="font-family:Arial,sans-serif;color:#333">
<h2>Dear {name},</h2>
<p>Thank you for applying for the <strong>{job_title}</strong> position.</p>
<p>Your application is currently <strong>on hold</strong> while we complete
our review of all candidates. We appreciate your patience.</p>
<p>We'll update you as soon as we have more information.</p>
<p style="margin-top:24px">Best regards,<br><em>The Hiring Team</em></p>
</body></html>""",
    },
    "interview_invite": {
        "subject": "Interview Invitation — {job_title}",
        "body": """<html><body style="font-family:Arial,sans-serif;color:#333">
<h2>Dear {name},</h2>
<p>We're excited to invite you for an interview for the
<strong>{job_title}</strong> position!</p>
<p>Please reply to this email with your availability for the coming week
so we can schedule a convenient time.</p>
<p style="margin-top:24px">Looking forward to meeting you!<br>
<em>The Hiring Team</em></p>
</body></html>""",
    },
}


def build_email(notif_type: str, name: str, job_title: str):
    """Render an email template. Returns (subject, html_body) or raises ValueError."""
    tpl = EMAIL_TEMPLATES.get(notif_type)
    if not tpl:
        raise ValueError(f"Unknown notification type: {notif_type}")
    subject = tpl["subject"].format(job_title=job_title)
    body = tpl["body"].format(name=name, job_title=job_title)
    return subject, body
