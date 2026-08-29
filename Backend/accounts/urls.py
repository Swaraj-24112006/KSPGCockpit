from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    RegisterView,
    LogoutView,
    PasswordChangeView,
    ForcePasswordChangeView,
    ForgotPasswordRequestView,
    VerifyOTPView,
    ResendOTPView,
    ResetPasswordView,
    PasswordResetRequestView,
    OTPVerifyView,
    ProfileView,
    UserViewSet,
    RoleViewSet,
)
from .superadmin_views import (
    SuperAdminSummaryView,
    SuperAdminUserViewSet,
    SuperAdminAuditLogListView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'superadmin/users', SuperAdminUserViewSet, basename='superadmin-user')

urlpatterns = [
    # Authentication — custom secure login with Redis session + HttpOnly cookie
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Mandatory first-login password change
    path('force-change-password/', ForcePasswordChangeView.as_view(), name='force-change-password'),

    # Password reset via Email OTP (Specification Endpoints)
    path('forgot-password/', ForgotPasswordRequestView.as_view(), name='forgot-password'),
    path('verify-reset-otp/', VerifyOTPView.as_view(), name='verify-reset-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('resend-reset-otp/', ResendOTPView.as_view(), name='resend-reset-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),

    # Backward compatibility aliases
    path('password/reset/', ForgotPasswordRequestView.as_view(), name='password-reset'),
    path('otp/verify/', VerifyOTPView.as_view(), name='otp-verify'),

    # Token refresh (uses cookie refresh token if needed)
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Profile & password
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),
    path('profile/', ProfileView.as_view(), name='profile'),

    # Dedicated SuperAdmin Management Endpoints
    path('superadmin/summary/', SuperAdminSummaryView.as_view(), name='superadmin-summary'),
    path('superadmin/audit-logs/', SuperAdminAuditLogListView.as_view(), name='superadmin-audit-logs'),
    path('superadmin/users/<int:pk>/toggle-status/', SuperAdminUserViewSet.as_view({'post': 'toggle_status'}), name='superadmin-user-toggle-status'),
    path('superadmin/users/<int:pk>/change-mini-factory/', SuperAdminUserViewSet.as_view({'post': 'change_mini_factory'}), name='superadmin-user-change-mf'),
    path('superadmin/users/<int:pk>/reset-temp-password/', SuperAdminUserViewSet.as_view({'post': 'reset_temp_password'}), name='superadmin-user-reset-temp-pwd'),
    path('superadmin/users/<int:pk>/assign-module-role/', SuperAdminUserViewSet.as_view({'post': 'assign_module_role'}), name='superadmin-user-assign-module-role'),

    # Standard User & Role router
    path('', include(router.urls)),
]
