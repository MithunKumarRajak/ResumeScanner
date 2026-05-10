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
            subject, body = build_email(
                notification_type, candidate_name, job_title)
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

        async def send_password_reset(self, to_email: str, reset_url: str) -> dict:
            subject = "Reset your ResumeScanner password"
            body = f"""
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
                    <h2 style="margin: 0 0 12px;">Password reset request</h2>
                    <p>You requested a password reset for your ResumeScanner account.</p>
                    <p>Click the button below to set a new password. This link expires soon for your security.</p>
                    <p style="margin: 24px 0;">
                        <a href="{reset_url}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
                    </p>
                    <p>If the button does not work, paste this URL into your browser:</p>
                    <p style="word-break:break-all;color:#4f46e5;">{reset_url}</p>
                    <p style="color:#64748b;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
                </div>
                """.strip()

            if self.sendgrid_key:
                return await self._send_sendgrid_custom(to_email, subject, body)
            elif self.smtp_host:
                return await self._send_smtp_custom(to_email, subject, body)

            print(f"[EMAIL MOCK RESET] To: {to_email} | URL: {reset_url}")
            return {"success": True, "message_id": "mock-dev-mode", "reset_url": reset_url}

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
        import smtplib
        import ssl
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

    async def _send_sendgrid_custom(self, to_email, subject, body) -> dict:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=self.sendgrid_key)
        message = Mail(from_email=self.from_email, to_emails=to_email,
                       subject=subject, html_content=body)
        response = sg.send(message)
        return {"success": response.status_code == 202,
                "message_id": response.headers.get("X-Message-Id", "")}

    async def _send_smtp_custom(self, to_email, subject, body) -> dict:
        import smtplib
        import ssl
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
