import os

class EmailService:
    """Supports SendGrid (primary) and SMTP fallback."""
    
    TEMPLATES = {
        "shortlisted": {
            "subject": "Congratulations! You've been shortlisted — {job_title}",
            "body": """
            <h2>Great news, {candidate_name}!</h2>
            <p>We are pleased to inform you that your application for <strong>{job_title}</strong>
            has been shortlisted. Our team will contact you soon with next steps.</p>
            <p>Thank you for your interest.</p>
            """
        },
        "rejected": {
            "subject": "Application Update — {job_title}",
            "body": """
            <h2>Dear {candidate_name},</h2>
            <p>Thank you for applying for <strong>{job_title}</strong>.
            After careful consideration, we have decided to move forward with other candidates
            whose experience more closely matches our current needs.</p>
            <p>We encourage you to apply for future openings.</p>
            """
        },
        "on_hold": {
            "subject": "Application Status Update — {job_title}",
            "body": """
            <h2>Dear {candidate_name},</h2>
            <p>Your application for <strong>{job_title}</strong> is currently under review.
            We will update you as soon as a decision is made. Thank you for your patience.</p>
            """
        },
        "interview_invite": {
            "subject": "Interview Invitation — {job_title}",
            "body": """
            <h2>Dear {candidate_name},</h2>
            <p>We are delighted to invite you for an interview for <strong>{job_title}</strong>.
            Please reply to this email to confirm your availability.</p>
            """
        }
    }

    def __init__(self):
        self.sendgrid_key = os.getenv("SENDGRID_API_KEY")
        self.smtp_host = os.getenv("SMTP_HOST")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@resumescanner.com")

    async def send(self, to_email: str, notification_type: str,
                   candidate_name: str, job_title: str) -> dict:
        template = self.TEMPLATES.get(notification_type)
        if not template:
            raise ValueError(f"Unknown notification type: {notification_type}")
        
        subject = template["subject"].format(job_title=job_title)
        body = template["body"].format(candidate_name=candidate_name, job_title=job_title)
        
        if self.sendgrid_key:
            return await self._send_sendgrid(to_email, subject, body)
        elif self.smtp_host:
            return await self._send_smtp(to_email, subject, body)
        else:
            # Dev mode: just log it
            print(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
            return {"success": True, "message_id": "mock-dev-mode"}

    async def _send_sendgrid(self, to_email, subject, body) -> dict:
        # Use sendgrid Python library
        # pip install sendgrid
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=self.sendgrid_key)
        message = Mail(from_email=self.from_email, to_emails=to_email,
                       subject=subject, html_content=body)
        response = sg.send(message)
        return {"success": response.status_code == 202,
                "message_id": response.headers.get("X-Message-Id", "")}

    async def _send_smtp(self, to_email, subject, body) -> dict:
        import smtplib, ssl
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        msg = MIMEMultipart("alternative")
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP_SSL(self.smtp_host, 465,
                               context=ssl.create_default_context()) as server:
            server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS"))
            server.sendmail(self.from_email, to_email, msg.as_string())
        return {"success": True, "message_id": "smtp-sent"}
