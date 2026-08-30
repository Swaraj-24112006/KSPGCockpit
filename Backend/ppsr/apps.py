"""
PPSR App — Django Application Configuration
============================================
Registers the ppsr app with Django's application registry.
"""

from django.apps import AppConfig


class PpsrConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ppsr'
    verbose_name = 'Practical Problem Solving Reports (PPSR)'

    def ready(self):
        import ppsr.signals  # noqa: F401

