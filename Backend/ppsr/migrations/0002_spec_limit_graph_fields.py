"""
Migration: Add spec-limit trend graph JSON fields to PpsrReport.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ppsr', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='ppsrreport',
            name='initial_spec_limit_graph',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='ppsrreport',
            name='effectiveness_spec_limit_graph',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
