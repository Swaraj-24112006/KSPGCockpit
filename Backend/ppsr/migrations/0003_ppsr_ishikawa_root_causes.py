"""
Add ishikawa_root_causes JSONField to PpsrReport.
Stores the root causes highlighted by the initiator from the Ishikawa fishbone inputs.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ppsr', '0002_spec_limit_graph_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='ppsrreport',
            name='ishikawa_root_causes',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
