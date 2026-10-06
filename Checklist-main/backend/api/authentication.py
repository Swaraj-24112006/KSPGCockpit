import logging
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings

logger = logging.getLogger(__name__)


class StatelessUser:
    """
    Lightweight user representation for Single Sign-On from KSPG Cockpit.
    Ensures DRF IsAuthenticated and view access without hard dependencies
    on local auth_user database table rows.
    """
    is_authenticated = True
    is_active = True
    is_anonymous = False

    def __init__(self, user_id, username, email='', role='', checklist_role='', is_superuser=False, is_staff=False):
        self.id = user_id
        self.pk = user_id
        self.username = username or f"user_{user_id}"
        self.email = email or ''
        self.role = checklist_role or role or ''
        self.checklist_role = checklist_role or ''
        self.is_superuser = bool(is_superuser or role == 'Super Administrator')
        self.is_staff = bool(is_staff or self.is_superuser)

    def __str__(self):
        return self.username

    def has_perm(self, perm, obj=None):
        return True

    def has_perms(self, perm_list, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True

    def get_username(self):
        return self.username


class CockpitSSOJWTAuthentication(JWTAuthentication):
    """
    Single Sign-On JWT Authentication for KSPG Checklist Backend.

    1. Validates JWT signature and expiry using the shared SECRET_KEY.
    2. Reads user claims (user_id, username, email, roles).
    3. Seamlessly finds or syncs the user into local sqlite db (auth_user).
    4. Dynamically attaches .role and .checklist_role to the user instance.
    5. Falls back to StatelessUser if DB sync fails, so valid tokens never
       trigger 'User not found' (401 Unauthorized).
    """

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        username = validated_token.get('username')
        email = validated_token.get('email', '')
        role = validated_token.get('role', '')
        checklist_role = validated_token.get('checklist_role', '')
        is_superuser = bool(validated_token.get('is_superuser', False) or role == 'Super Administrator')
        is_staff = bool(validated_token.get('is_staff', False) or is_superuser)

        if not username:
            username = f"user_{user_id}"

        User = get_user_model()
        user = None

        # 1. Try to find or sync user in local db
        try:
            user = User.objects.filter(id=user_id).first()
            if not user:
                user = User.objects.filter(username=username).first()
                if not user:
                    user = User.objects.create(
                        id=user_id,
                        username=username,
                        email=email,
                        is_active=True,
                        is_superuser=is_superuser,
                        is_staff=is_staff,
                    )
                else:
                    if user.email != email and email:
                        user.email = email
                        user.save(update_fields=['email'])

            if user:
                if not user.is_active:
                    raise AuthenticationFailed("User is inactive", code="user_inactive")
                user.role = checklist_role or role or ''
                user.checklist_role = checklist_role or ''
                return user
        except AuthenticationFailed:
            raise
        except Exception as e:
            logger.warning("Local sqlite User sync encountered: %s; falling back to StatelessUser", e)

        # 2. Resilient fallback to StatelessUser
        return StatelessUser(
            user_id=user_id,
            username=username,
            email=email,
            role=role,
            checklist_role=checklist_role,
            is_superuser=is_superuser,
            is_staff=is_staff,
        )
