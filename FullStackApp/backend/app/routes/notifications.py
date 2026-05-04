"""
POST /api/notifications/send  — Send email notification to a candidate.

Supports SendGrid (SENDGRID_API_KEY) or SMTP fallback (SMTP_HOST).
"""
import logging, smtplib, uuid
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.notification import EmailNotification, NotificationType, NotificationStatus
from app.models.user import User
from app.utils.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# ── Schemas ──

class SendRequest(BaseModel):
    candidate_email: EmailStr
    notification_type: str  # shortlisted | rejected | on_hold
    candidate_name: str
    job_title: str
    resume_analysis_id: Optional[str] = None

class SendResponse(BaseModel):
    success: bool
    message_id: str


# ── HTML templates ──

_TEMPLATES = {
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


def _build_email(notif_type: str, name: str, job_title: str):
    tpl = _TEMPLATES.get(notif_type)
    if not tpl:
        raise ValueError(f"Unknown notification type: {notif_type}")
    subject = tpl["subject"].format(name=name, job_title=job_title)
    body = tpl["body"].format(name=name, job_title=job_title)
    return subject, body


# ── Sending backends ──

def _send_sendgrid(to: str, subject: str, html: str) -> str:
    """Send via SendGrid HTTP API. Returns message ID."""
    import httpx
    api_key = getattr(settings, "SENDGRID_API_KEY", "")
    from_email = getattr(settings, "FROM_EMAIL", "noreply@resumescanner.app")
    resp = httpx.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": from_email},
            "subject": subject,
            "content": [{"type": "text/html", "value": html}],
        },
        timeout=10,
    )
    if resp.status_code not in (200, 201, 202):
        raise RuntimeError(f"SendGrid error {resp.status_code}: {resp.text}")
    return resp.headers.get("X-Message-Id", str(uuid.uuid4()))


def _send_smtp(to: str, subject: str, html: str) -> str:
    """Send via SMTP. Returns a generated message ID."""
    host = getattr(settings, "SMTP_HOST", "")
    port = int(getattr(settings, "SMTP_PORT", 587))
    user = getattr(settings, "SMTP_USER", "")
    pwd = getattr(settings, "SMTP_PASSWORD", "")
    from_email = getattr(settings, "FROM_EMAIL", "noreply@resumescanner.app")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(host, port) as srv:
        srv.ehlo()
        srv.starttls()
        if user:
            srv.login(user, pwd)
        srv.sendmail(from_email, [to], msg.as_string())
    return str(uuid.uuid4())


# ── Route ──

@router.post("/send", response_model=SendResponse)
def send_notification(
    payload: SendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send an email notification and persist the record."""
    valid_types = [t.value for t in NotificationType]
    if payload.notification_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type must be one of: {valid_types}")

    subject, body = _build_email(payload.notification_type, payload.candidate_name, payload.job_title)

    # Create DB record
    notif = EmailNotification(
        candidate_email=payload.candidate_email,
        notification_type=payload.notification_type,
        subject=subject,
        body=body,
        status=NotificationStatus.pending,
        resume_analysis_id=payload.resume_analysis_id,
    )
    db.add(notif)
    db.flush()

    message_id = notif.id
    try:
        sg_key = getattr(settings, "SENDGRID_API_KEY", "")
        smtp_host = getattr(settings, "SMTP_HOST", "")
        if sg_key:
            message_id = _send_sendgrid(payload.candidate_email, subject, body)
        elif smtp_host:
            message_id = _send_smtp(payload.candidate_email, subject, body)
        else:
            logger.warning("No email backend configured (SENDGRID_API_KEY / SMTP_HOST). "
                           "Notification saved but NOT sent.")
            notif.status = NotificationStatus.pending
            db.commit()
            return SendResponse(success=False, message_id=notif.id)

        notif.status = NotificationStatus.sent
        notif.sent_at = datetime.utcnow()
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        notif.status = NotificationStatus.failed

    db.commit()
    success = notif.status == NotificationStatus.sent
    return SendResponse(success=success, message_id=message_id)
