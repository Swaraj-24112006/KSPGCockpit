"""
accounts/email_service.py — Secure Email Dispatch Service
=========================================================
Handles sending OTP verification emails for password resets via Django SMTP.
"""

import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger('kaizen')

def send_password_reset_email(to_email: str, username: str, raw_otp: str, expires_minutes: int = 5) -> bool:
    """
    Dispatches a password reset OTP verification code to the user's registered email address.
    Returns True if sent successfully, False otherwise.
    """
    if not to_email:
        logger.warning(f"PASSWORD_RESET_EMAIL_SKIPPED: User '{username}' has no email configured.")
        return False

    subject = "KSPG Cockpit — Password Reset Verification Code"
    
    # Plain text version
    text_content = f"""KSPG COCKPIT // SECURITY PROTOCOL
=============================================

Hello {username},

A password reset request was initiated for your KSPG Cockpit account.

Your 6-Digit Verification Code is:

    {raw_otp}

This OTP is valid for {expires_minutes} minutes.

If you did not request this password reset, please ignore this email. Your account remains completely secure.

— KSPG Operations Security Team
"""

    # Rich HTML version matching Cockpit design
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #0c0e14;
          color: #e1e2ea;
          margin: 0;
          padding: 24px;
        }}
        .container {{
          max-width: 520px;
          margin: 0 auto;
          background-color: #191c21;
          border: 1px solid rgba(106, 123, 217, 0.35);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        }}
        .header {{
          border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
          padding-bottom: 16px;
          margin-bottom: 24px;
          text-align: center;
        }}
        .tag {{
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #4C7FFF;
          text-transform: uppercase;
        }}
        .title {{
          font-size: 22px;
          font-weight: 800;
          color: #f1f3f5;
          margin: 8px 0 0 0;
        }}
        .otp-box {{
          background: #111319;
          border: 1px solid #4C7FFF;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 24px 0;
          box-shadow: 0 0 20px rgba(76, 127, 255, 0.15);
        }}
        .otp-code {{
          font-family: 'Courier New', Courier, monospace;
          font-size: 36px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #4C7FFF;
        }}
        .warning {{
          font-size: 13px;
          color: #a9b5d4;
          line-height: 1.6;
          margin-top: 16px;
        }}
        .footer {{
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 11px;
          color: #8d90a0;
          text-align: center;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="tag">KSPG COCKPIT // SECURITY VERIFICATION</div>
          <h1 class="title">Passcode Recovery</h1>
        </div>
        
        <p style="font-size: 15px; color: #e1e2ea; margin: 0 0 12px 0;">Hello <strong>{username}</strong>,</p>
        <p style="font-size: 14px; color: #c3c6d7; margin: 0 0 20px 0; line-height: 1.5;">
          A password reset request was initiated for your KSPG Cockpit account. Please enter the verification code below to authorize your password update:
        </p>

        <div class="otp-box">
          <div style="font-size: 11px; color: #8d90a0; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px;">Single-Use Security OTP</div>
          <div class="otp-code">{raw_otp}</div>
          <div style="font-size: 12px; color: #ffb4ab; margin-top: 8px;">⏱ Expires in {expires_minutes} minutes</div>
        </div>

        <p class="warning">
          🛡 <strong>Security Notice:</strong> Never share this code with anyone. KSPG staff will never ask for your verification code. If you did not make this request, you can safely ignore this email.
        </p>

        <div class="footer">
          © 2026 KSPG OPERATIONS // INDUSTRIAL KAIZEN PROTOCOL<br>
          CONFIDENTIAL - AUTOMATED SYSTEM MESSAGE
        </div>
      </div>
    </body>
    </html>
    """

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"OTP_SENT: user={username}, destination={to_email[:3]}***@***")
        return True
    except Exception as exc:
        logger.error(f"OTP_EMAIL_FAILED: user={username}, error={exc}")
        return False
