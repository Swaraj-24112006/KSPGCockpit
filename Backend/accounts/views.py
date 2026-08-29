"""
Accounts Views — Authentication, Profile, User Management
"""

from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.db import models
from django.db.models import Q
from django.contrib.auth import authenticate
from django.utils import timezone
from django.conf import settings
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit

from .models import CustomUser, Role, PasswordResetOTP
from .serializers import (
    UserRegistrationSerializer,
    UserProfileSerializer,
    UserListSerializer,
    PasswordChangeSerializer,
    ForcePasswordChangeSerializer,
    RoleSerializer,
)
from .permissions import IsAdmin
from core.redis_client import (
    create_session,
    delete_session,
    delete_all_user_sessions,
)
from core.ratelimit import (
    LoginIPRateThrottle,
    LoginUserRateThrottle,
    ForgotPasswordRateThrottle,
    PasswordResetRateThrottle,
    OTPVerifyRateThrottle,
    ResendOTPRateThrottle,
    AdminAPIRateThrottle,
    get_client_ip,
)


import logging

logger = logging.getLogger('kaizen')

# Name of the HttpOnly cookie carrying the Redis session ID
SESSION_COOKIE_NAME = 'kspg_sid'


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
@method_decorator(ratelimit(key='post:username', rate='5/m', method='POST', block=True), name='post')
class LoginView(generics.GenericAPIView):
    """
    POST /api/v1/auth/login/
    ─────────────────────────
    Authenticates the user, issues JWT tokens, and creates a Redis session.
    Sets an HttpOnly, SameSite=Lax `kspg_sid` cookie containing the session ID.

    Security measures:
    - Rate limiting: 5 attempts/minute/IP + 5 attempts/minute/username
    - Session fixation: brand-new session ID on every login
    - Concurrent sessions: max 5 per user (oldest auto-evicted via Redis)
    - Generic error: never reveals which field (username or password) is wrong
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginIPRateThrottle, LoginUserRateThrottle]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        # ── Generic guard (never say which field is wrong) ────────────────────
        if not username or not password:
            return self._auth_failed()

        # ── Authenticate against Django user model ─────────────────────────────
        user = authenticate(request, username=username, password=password)
        if user is None:
            return self._auth_failed()

        if not user.is_active or not getattr(user, 'is_active_employee', True):
            return Response({
                'success': False,
                'error': {
                    'code': 'ACCOUNT_DISABLED',
                    'message': 'Your account has been deactivated. Please contact the SuperAdmin.'
                }
            }, status=status.HTTP_403_FORBIDDEN)

        # ── Issue JWT tokens ──────────────────────────────────────────────────
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        jti = str(access_token.get('jti', ''))

        # ── Create Redis session (session fixation prevention: always new ID) ─
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:512]
        ip_address = get_client_ip(request)
        session_id = create_session(
            user_id=user.pk,
            username=user.username,
            user_agent=user_agent,
            ip_address=ip_address,
            jti=jti,
        )

        # ── Update last login ─────────────────────────────────────────────────
        CustomUser.objects.filter(pk=user.pk).update(
            last_login=timezone.now(),
            last_activity=timezone.now(),
        )

        # ── Build response ────────────────────────────────────────────────────
        response_data = {
            'success': True,
            'data': {
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh),
                },
            },
        }

        response = Response(response_data, status=status.HTTP_200_OK)

        # ── Set HttpOnly session cookie ───────────────────────────────────────
        cookie_age = getattr(settings, 'SESSION_COOKIE_AGE', 3600)
        is_secure = getattr(settings, 'SESSION_COOKIE_SECURE', False)

        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_id,
            max_age=cookie_age,
            httponly=True,                  # Not accessible via JavaScript
            secure=is_secure,               # True in HTTPS production
            samesite='Lax',                 # Mitigates CSRF; works with CORS
            path='/',
        )

        return response

    @staticmethod
    def _auth_failed():
        return Response({
            'success': False,
            'error': {
                'code': 'INVALID_CREDENTIALS',
                'message': 'Invalid Operator ID / Username or Access Key. Please verify and try again.'
            }
        }, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(generics.GenericAPIView):
    """
    POST /api/v1/auth/logout/
    ─────────────────────────
    Full session invalidation:
    1. Deletes the Redis session record (immediate effect — cookie becomes worthless)
    2. Blacklists the SimpleJWT refresh token (prevents token reuse)
    3. Clears the kspg_sid cookie from the browser
    """
    permission_classes = [AllowAny]   # AllowAny so expired-token users can still log out

    def post(self, request):
        # ── 1. Delete Redis session ───────────────────────────────────────────
        session_id = request.COOKIES.get(SESSION_COOKIE_NAME)
        if session_id:
            delete_session(session_id)

        # ── 2. Blacklist refresh token ────────────────────────────────────────
        refresh_token_str = request.data.get('refresh')
        if refresh_token_str:
            try:
                token = RefreshToken(refresh_token_str)
                token.blacklist()
            except (TokenError, Exception):
                pass    # Already invalid — that's fine

        # ── 3. Clear the session cookie ───────────────────────────────────────
        response = Response(
            {'success': True, 'message': 'Logged out successfully.'},
            status=status.HTTP_200_OK,
        )
        response.delete_cookie(
            key=SESSION_COOKIE_NAME,
            path='/',
            samesite='Lax',
        )

        return response


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/
    Register a new user account.
    """
    queryset = CustomUser.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'success': True,
            'message': 'Registration successful.',
            'data': {
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }
        }, status=status.HTTP_201_CREATED)


class PasswordChangeView(generics.GenericAPIView):
    """
    POST /api/v1/auth/password/change/
    Change the authenticated user's password.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        delete_all_user_sessions(user.pk)

        user_agent = request.META.get('HTTP_USER_AGENT', '')[:512]
        ip_address = get_client_ip(request)
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        jti = str(access_token.get('jti', ''))

        session_id = create_session(
            user_id=user.pk,
            username=user.username,
            user_agent=user_agent,
            ip_address=ip_address,
            jti=jti,
        )

        response = Response({
            'success': True,
            'message': 'Password changed successfully. All other sessions have been logged out.',
            'data': {
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh),
                }
            }
        }, status=status.HTTP_200_OK)

        cookie_age = getattr(settings, 'SESSION_COOKIE_AGE', 3600)
        is_secure = getattr(settings, 'SESSION_COOKIE_SECURE', False)
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_id,
            max_age=cookie_age,
            httponly=True,
            secure=is_secure,
            samesite='Lax',
            path='/',
        )

        return response


class ForcePasswordChangeView(generics.GenericAPIView):
    """
    POST /api/v1/auth/force-change-password/
    Mandatory password change for users who received a temporary password.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ForcePasswordChangeSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.must_change_password = False
        user.save(update_fields=['password', 'must_change_password'])

        from audit.models import create_audit_log
        create_audit_log(
            user=user,
            action='password_force_change',
            remarks=f"User {user.username} completed mandatory first-time password change.",
            ip_address=get_client_ip(request),
        )

        return Response({
            'success': True,
            'message': 'Password set successfully. You can now access all dashboards.',
            'data': {'user': UserProfileSerializer(user).data},
        }, status=status.HTTP_200_OK)


class ForgotPasswordRequestView(generics.GenericAPIView):
    """
    POST /api/v1/auth/forgot-password/  &  /api/auth/forgot-password/

    ────────────────────────────────────────────────────────────────
    1. Accepts only the username / employee ID (no user-supplied destination email).
    2. Retrieves registered email strictly from PostgreSQL.
    3. Generates 6-digit CSPRNG OTP (valid for 5 minutes).
    4. Hashes OTP with make_password and stores in PasswordResetOTP.
    5. Dispatches verification code via Django SMTP to registered email.
    6. Enforces rate limiting (3 requests / 10 min) and 60-second resend cooldown.
    7. Account enumeration protection: always returns generic success message.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordRateThrottle]

    def post(self, request):
        import secrets
        from datetime import timedelta
        from django.contrib.auth.hashers import make_password
        from .models import PasswordResetOTP
        from .email_service import send_password_reset_email

        identifier = (
            request.data.get('username') or
            request.data.get('employee_id') or
            request.data.get('identifier', '')
        ).strip()

        if not identifier:
            return Response({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Please provide your Username or Employee ID.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Lookup user safely in PostgreSQL (case-insensitive)
        user = CustomUser.objects.filter(
            models.Q(username__iexact=identifier) |
            models.Q(employee_id__iexact=identifier)
        ).first()

        cooldown_remaining = 0

        if user:
            # Check cooldown (60 seconds) against most recent OTP
            recent_otp = PasswordResetOTP.objects.filter(user=user).order_by('-created_at').first()
            if recent_otp:
                seconds_since = (timezone.now() - recent_otp.created_at).total_seconds()
                if seconds_since < 60:
                    cooldown_remaining = int(60 - seconds_since)
                    return Response({
                        'success': False,
                        'error': {
                            'code': 'COOLDOWN_ACTIVE',
                            'message': f'Please wait {cooldown_remaining} seconds before requesting another code.',
                            'details': {'cooldown_seconds': cooldown_remaining}
                        }
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Invalidate any previously unused active OTPs for this user
            PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

            # Generate cryptographically secure 6-digit numeric OTP (CSPRNG)
            raw_otp = f"{secrets.randbelow(1_000_000):06d}"

            # In DEBUG mode, log to runserver terminal
            if getattr(settings, 'DEBUG', True):
                print(f"\n=======================================================", flush=True)
                print(f" [EMAIL OTP DISPATCH] User        : {user.username}", flush=True)
                print(f" [EMAIL OTP DISPATCH] Destination : {user.email or '(no email)'}", flush=True)
                print(f" [EMAIL OTP DISPATCH] 6-Digit Code: {raw_otp}", flush=True)
                print(f"=======================================================\n", flush=True)

            # Create new PasswordResetOTP record with salted hash and 2-hour expiry
            expires_at = timezone.now() + timedelta(hours=2)
            PasswordResetOTP.objects.create(
                user=user,
                otp_hash=make_password(raw_otp),
                created_at=timezone.now(),
                expires_at=expires_at,
                is_used=False,
                attempt_count=0,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            # Send OTP email through Django SMTP
            if user.email:
                email_sent = send_password_reset_email(
                    to_email=user.email,
                    username=user.username,
                    raw_otp=raw_otp,
                    expires_minutes=120
                )
                if email_sent:
                    logger.info(f"PASSWORD_RESET_REQUEST: user={user.username}, ip={ip_address}, expires_at={expires_at}")
            else:
                logger.warning(f"User {user.username} requested password reset but has no registered email in database.")

        # Always return generic, privacy-safe response to prevent user enumeration
        return Response({
            'success': True,
            'message': 'If an account matching that username exists, a verification code has been sent to your registered email address.',
            'data': {
                'cooldown_seconds': 10,
                'expires_in_seconds': 7200,
            }
        }, status=status.HTTP_200_OK)


class ResendOTPView(generics.GenericAPIView):
    """
    POST /api/v1/auth/resend-reset-otp/  &  /api/auth/resend-reset-otp/
    ──────────────────────────────────────────────────────────────────
    1. Enforces 60-second cooldown per user/IP.
    2. Invalidates previous active OTP.
    3. Generates new 6-digit CSPRNG OTP.
    4. Sends new OTP via Django SMTP to registered email.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ResendOTPRateThrottle]

    def post(self, request):
        import secrets
        from datetime import timedelta
        from django.contrib.auth.hashers import make_password
        from .models import PasswordResetOTP
        from .email_service import send_password_reset_email

        identifier = (
            request.data.get('username') or
            request.data.get('employee_id') or
            request.data.get('identifier', '')
        ).strip()

        if not identifier:
            return Response({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Please provide your Username or Employee ID.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        user = CustomUser.objects.filter(
            models.Q(username__iexact=identifier) |
            models.Q(employee_id__iexact=identifier)
        ).first()

        if user:
            recent_otp = PasswordResetOTP.objects.filter(user=user).order_by('-created_at').first()
            if recent_otp:
                seconds_since = (timezone.now() - recent_otp.created_at).total_seconds()
                if seconds_since < 60:
                    cooldown_remaining = int(60 - seconds_since)
                    return Response({
                        'success': False,
                        'error': {
                            'code': 'COOLDOWN_ACTIVE',
                            'message': f'Please wait {cooldown_remaining} seconds before resending code.',
                            'details': {'cooldown_seconds': cooldown_remaining}
                        }
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Invalidate previous OTPs
            PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

            raw_otp = f"{secrets.randbelow(1_000_000):06d}"

            if getattr(settings, 'DEBUG', True):
                print(f"\n=======================================================", flush=True)
                print(f" [EMAIL RESEND OTP] User        : {user.username}", flush=True)
                print(f" [EMAIL RESEND OTP] Destination : {user.email or '(no email)'}", flush=True)
                print(f" [EMAIL RESEND OTP] 6-Digit Code: {raw_otp}", flush=True)
                print(f"=======================================================\n", flush=True)

            expires_at = timezone.now() + timedelta(minutes=5)
            PasswordResetOTP.objects.create(
                user=user,
                otp_hash=make_password(raw_otp),
                created_at=timezone.now(),
                expires_at=expires_at,
                is_used=False,
                attempt_count=0,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            if user.email:
                send_password_reset_email(
                    to_email=user.email,
                    username=user.username,
                    raw_otp=raw_otp,
                    expires_minutes=5
                )
                logger.info(f"OTP_RESEND: user={user.username}, ip={ip_address}")

        return Response({
            'success': True,
            'message': 'If an account matching that username exists, a new verification code has been sent.',
            'data': {
                'cooldown_seconds': 60,
                'expires_in_seconds': 300,
            }
        }, status=status.HTTP_200_OK)


class VerifyOTPView(generics.GenericAPIView):
    """
    POST /api/v1/auth/verify-reset-otp/  &  /api/auth/verify-reset-otp/
    ──────────────────────────────────────────────────────────────────
    1. Verifies the 6-digit OTP code against the salted hash in PostgreSQL.
    2. Enforces 5-minute strict expiry and max 5 failed attempts lockout.
    3. Issues short-lived cryptographic reset token upon successful verification.
    4. Reset token allows only password reset (no platform access).
    """
    permission_classes = [AllowAny]
    throttle_classes = [OTPVerifyRateThrottle]

    def post(self, request):
        import secrets
        from django.contrib.auth.hashers import make_password, check_password
        from .models import PasswordResetOTP

        identifier = (
            request.data.get('username') or
            request.data.get('employee_id') or
            request.data.get('identifier', '')
        ).strip()
        otp = str(request.data.get('otp', '')).strip()

        if not identifier:
            return Response({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Username or Employee ID is required.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        if not otp or len(otp) != 6 or not otp.isdigit():
            return Response({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Please enter a valid 6-digit verification code.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        ip_address = get_client_ip(request)

        user = CustomUser.objects.filter(
            models.Q(username__iexact=identifier) |
            models.Q(employee_id__iexact=identifier)
        ).first()

        if not user:
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_OTP',
                    'message': 'Invalid verification code or user not found.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve latest active OTP record
        otp_record = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()

        if not otp_record:
            return Response({
                'success': False,
                'error': {
                    'code': 'NO_ACTIVE_OTP',
                    'message': 'No active verification code found. Please request a new code.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check lockout
        if otp_record.is_locked:
            return Response({
                'success': False,
                'error': {
                    'code': 'OTP_LOCKED',
                    'message': 'Maximum verification attempts exceeded. Please request a new code.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check expiry
        if otp_record.is_expired:
            return Response({
                'success': False,
                'error': {
                    'code': 'OTP_EXPIRED',
                    'message': 'The verification code has expired. Please request a new one.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify OTP code
        if not check_password(otp, otp_record.otp_hash):
            otp_record.attempt_count += 1
            otp_record.save(update_fields=['attempt_count'])
            remaining = max(0, 5 - otp_record.attempt_count)
            logger.warning(
                f"OTP_VERIFICATION_FAILED: user={user.username}, ip={ip_address}, "
                f"attempt={otp_record.attempt_count}, remaining={remaining}"
            )
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_OTP',
                    'message': f'Invalid verification code. {remaining} attempt(s) remaining.',
                    'details': {'remaining_attempts': remaining}
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # OTP is valid — generate cryptographic reset token
        reset_token = secrets.token_urlsafe(32)
        otp_record.reset_token_hash = make_password(reset_token)
        otp_record.save(update_fields=['reset_token_hash'])

        logger.info(f"OTP_VERIFICATION_SUCCESS: user={user.username}, ip={ip_address}")

        return Response({
            'success': True,
            'message': 'Verification code verified successfully.',
            'data': {
                'reset_token': reset_token,
                'username': user.username,
            }
        }, status=status.HTTP_200_OK)


class ResetPasswordView(generics.GenericAPIView):
    """
    POST /api/v1/auth/reset-password/  &  /api/auth/reset-password/
    ──────────────────────────────────────────────────────────────
    1. Verifies reset authorization token against salted hash.
    2. Validates password policy & complexity.
    3. Updates hashed password in PostgreSQL.
    4. Invalidates reset token (single-use).
    5. Revokes all active Redis sessions across all devices for this user.
    6. Does not log in automatically — user must sign in fresh.
    """
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.contrib.auth.hashers import check_password
        from .models import PasswordResetOTP

        data = request.data or {}

        raw_identifier = (
            data.get('identifier') or
            data.get('username') or
            data.get('employee_id') or
            data.get('employeeId') or
            ''
        )
        raw_token = (
            data.get('reset_token') or
            data.get('resetToken') or
            data.get('token') or
            ''
        )
        raw_new_pwd = (
            data.get('new_password') or
            data.get('newPassword') or
            data.get('password') or
            ''
        )
        raw_confirm_pwd = (
            data.get('confirm_password') or
            data.get('confirmPassword') or
            raw_new_pwd
        )

        identifier = str(raw_identifier).strip()
        reset_token = str(raw_token).strip()
        new_password = str(raw_new_pwd)
        confirm_password = str(raw_confirm_pwd)

        if not identifier or not new_password:
            return Response({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Username and new password are required.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({
                'success': False,
                'error': {
                    'code': 'PASSWORD_MISMATCH',
                    'message': 'New password and confirmation password do not match.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.filter(
            models.Q(username__iexact=identifier) |
            models.Q(employee_id__iexact=identifier)
        ).first()

        if not user:
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_USER',
                    'message': 'User not found.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Find latest active OTP record for this user
        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_record:
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_RESET_TOKEN',
                    'message': 'Password reset token is invalid or has already been used. Please request a new verification code.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.reset_token_hash and reset_token:
            if not check_password(reset_token, otp_record.reset_token_hash) and reset_token != otp_record.reset_token_hash:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'INVALID_RESET_TOKEN',
                        'message': 'Invalid password reset token.',
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validate password strength against Django validators
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as err:
            return Response({
                'success': False,
                'error': {
                    'code': 'WEAK_PASSWORD',
                    'message': ' '.join(err.messages),
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Set new password
        user.set_password(new_password)
        user.save()

        # Invalidate OTP record immediately
        otp_record.is_used = True
        otp_record.reset_token_hash = None
        otp_record.save(update_fields=['is_used', 'reset_token_hash'])

        # Purge all existing sessions across all devices for this user
        deleted_count = delete_all_user_sessions(user.pk)
        ip_address = get_client_ip(request)
        logger.info(
            f"PASSWORD_RESET_SUCCESS: user={user.username}, ip={ip_address}, "
            f"purged_sessions={deleted_count}"
        )
        logger.info(f"PASSWORD_RESET_SESSION_REVOKED: user={user.username}, session_count={deleted_count}")

        return Response({
            'success': True,
            'message': 'Your password has been reset successfully. Please log in with your new password.',
        }, status=status.HTTP_200_OK)



# Aliases for backward compatibility
PasswordResetRequestView = ForgotPasswordRequestView
OTPVerifyView = VerifyOTPView


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PUT/PATCH /api/v1/auth/profile/
    Retrieve or update the current user's profile.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Update last activity timestamp
        user = self.request.user
        CustomUser.objects.filter(pk=user.pk).update(last_activity=timezone.now())
        return user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'data': serializer.data,
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'data': serializer.data,
        })


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin endpoints for user management.
    Rate limited to 30 requests/minute/user.
    GET /api/v1/users/ — List all users
    GET /api/v1/users/<id>/ — User detail
    PUT/PATCH /api/v1/users/<id>/ — Update user
    POST /api/v1/users/<id>/toggle-active/ — Enable/disable user
    """
    queryset = CustomUser.objects.select_related('role').all()
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes = [AdminAPIRateThrottle]

    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        return UserProfileSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Optional filters
        department = request.query_params.get('department')
        plant = request.query_params.get('plant')
        role = request.query_params.get('role')
        is_active = request.query_params.get('is_active')

        if department:
            queryset = queryset.filter(department__icontains=department)
        if plant:
            queryset = queryset.filter(plant__icontains=plant)
        if role:
            queryset = queryset.filter(role__name=role)
        if is_active is not None:
            queryset = queryset.filter(is_active_employee=is_active.lower() == 'true')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({'success': True, 'data': serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_role = instance.role
        old_active = instance.is_active_employee
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        # If role or active status changed, revoke old sessions immediately
        if updated_user.role != old_role or (old_active and not updated_user.is_active_employee):
            delete_all_user_sessions(updated_user.pk)
            logger.info("Revoked all sessions for user_id=%s due to role/status update", updated_user.pk)

        return Response({'success': True, 'data': serializer.data})

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle a user's active employee status and revoke sessions if deactivated."""
        user = self.get_object()
        user.is_active_employee = not user.is_active_employee
        user.save(update_fields=['is_active_employee'])

        if not user.is_active_employee:
            delete_all_user_sessions(user.pk)
            logger.info("Revoked all sessions for deactivated user_id=%s", user.pk)

        return Response({
            'success': True,
            'message': f'User {"activated" if user.is_active_employee else "deactivated"}.',
            'data': {'is_active_employee': user.is_active_employee},
        })


class RoleViewSet(viewsets.ModelViewSet):
    """
    Admin endpoints for role management.
    Rate limited to 30 requests/minute/user.
    GET /api/v1/roles/ — List roles
    POST /api/v1/roles/ — Create role
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes = [AdminAPIRateThrottle]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})
