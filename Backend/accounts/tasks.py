"""
Celery Background Tasks for Accounts App
==========================================
Handles asynchronous email dispatch and notification background jobs.
"""

import logging
from celery import shared_task
from accounts.email_service import send_password_reset_email

logger = logging.getLogger('kaizen')


@shared_task(bind=True, max_retries=3, default_retry_delay=10, name='accounts.send_password_reset_email_task')
def send_password_reset_email_task(self, to_email: str, username: str, raw_otp: str, expires_minutes: int = 5):
    """
    Celery task to asynchronously dispatch an OTP verification email.
    """
    logger.info(f"Executing async email task for user '{username}' to '{to_email}'")
    success = send_password_reset_email(to_email, username, raw_otp, expires_minutes)
    if not success:
        logger.warning(f"Email task encountered an issue dispatching to {to_email}")
    return {'success': success}
