import os

class EmailService:
    """Supports SendGrid (primary) and SMTP fallback."""
    
    def __init__(self):
        self.sendgrid_key = os.getenv("SENDGRID_API_KEY")
        self.smtp_host = os.getenv("SMTP_HOST")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@resumescanner.com")

    async def send(self, to_email: str, notification_type: str,
                   candidate_name: str, job_title: str) -> dict:
        from app.services.common import build_email
        try:
            subject, body = build_email(notification_type, candidate_name, job_title)
        except ValueError as e:
            raise ValueError(str(e))
        
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
