"""
POST /api/notifications/send  — Send email notification to a candidate.

Supports SendGrid (SENDGRID_API_KEY) or SMTP fallback (SMTP_HOST).
"""
import logging
import smtplib
import uuid
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

#  Schemas


class SendRequest(BaseModel):
    candidate_email: EmailStr
    notification_type: str  # shortlisted | rejected | on_hold
    candidate_name: str
    job_title: str
    resume_analysis_id: Optional[str] = None


class SendResponse(BaseModel):
    success: bool
    message_id: str


#  HTML templates — delegates to app.services.common ─

from app.services.common import build_email as _build_email


#  Sending backends

def _send_sendgrid(to: str, subject: str, html: str) -> str:
    """Send via SendGrid HTTP API. Returns message ID."""
    import httpx
    api_key = getattr(settings, "SENDGRID_API_KEY", "")
    from_email = getattr(settings, "FROM_EMAIL", "noreply@resumescanner.app")
    resp = httpx.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={"Authorization": f"Bearer {api_key}",
                 "Content-Type": "application/json"},
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
    pwd = getattr(settings, "SMTP_PASS", "")
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


#  Route

@router.post("/send", response_model=SendResponse)
def send_notification(
    payload: SendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send an email notification and persist the record."""
    user_role = current_user.role.value if hasattr(
        current_user.role, "value") else str(current_user.role)
    if user_role not in {"recruiter", "admin"}:
        raise HTTPException(
            status_code=403, detail="Only recruiters can send candidate notifications.")

    valid_types = [t.value for t in NotificationType]
    if payload.notification_type not in valid_types:
        raise HTTPException(
            status_code=400, detail=f"Type must be one of: {valid_types}")

    subject, body = _build_email(
        payload.notification_type, payload.candidate_name, payload.job_title)

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
