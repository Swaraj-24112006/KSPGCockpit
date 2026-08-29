"""
CFT Awards App — Django Application Configuration
===================================================
Registers the cft_awards app with Django's application registry.
"""

from django.apps import AppConfig


class CftAwardsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cft_awards'
    verbose_name = 'CFT Monthly Awards'
