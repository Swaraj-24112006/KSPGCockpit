import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.conf import settings


@pytest.fixture(scope="session")
def django_db_setup(
    request,
    django_test_environment,
    django_db_blocker,
    django_db_use_migrations,
    django_db_keepdb,
    django_db_createdb,
    django_db_modify_db_settings,
):
    from django.db import connections
    from django.test.utils import setup_databases, teardown_databases

    settings.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'ATOMIC_REQUESTS': False,
        'AUTOCOMMIT': True,
        'CONN_MAX_AGE': 0,
        'CONN_HEALTH_CHECKS': False,
        'OPTIONS': {},
        'TIME_ZONE': None,
        'USER': '',
        'PASSWORD': '',
        'HOST': '',
        'PORT': '',
        'TEST': {
            'CHARSET': None,
            'COLLATION': None,
            'MIGRATE': True,
            'MIRROR': None,
            'NAME': ':memory:',
        },
    }
    connections.close_all()
    try:
        delattr(connections._connections, 'default')
    except AttributeError:
        pass
    connections._databases = None

    with django_db_blocker.unblock():
        db_cfg = setup_databases(
            verbosity=0,
            interactive=False,
        )

    yield

    with django_db_blocker.unblock():
        try:
            teardown_databases(db_cfg, verbosity=0)
        except Exception:
            pass


@pytest.fixture
def api_client(db):
    """
    Returns an independent APIClient instance authenticated with a test user.
    """
    client = APIClient()
    user = User.objects.create_user(username='testplanner', password='password123')
    client.force_authenticate(user=user)
    return client
