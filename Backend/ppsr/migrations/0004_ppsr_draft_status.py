"""
Add Draft status, make core fields blank-able, and add last_saved_step
for the PPSR Save Draft feature.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ppsr', '0003_ppsr_ishikawa_root_causes'),
    ]

    operations = [
        # 1. Add 'Draft' to status choices and update defaults
        migrations.AlterField(
            model_name='ppsrreport',
            name='status',
            field=models.CharField(
                choices=[
                    ('Draft', 'Draft'),
                    ('Open', 'Open'),
                    ('In-Progress', 'In-Progress'),
                    ('Closed', 'Closed'),
                ],
                default='Open',
                max_length=20,
            ),
        ),
        # 2. Make title blank-able
        migrations.AlterField(
            model_name='ppsrreport',
            name='title',
            field=models.CharField(blank=True, default='', max_length=300),
        ),
        # 3. Make problem_statement blank-able
        migrations.AlterField(
            model_name='ppsrreport',
            name='problem_statement',
            field=models.TextField(blank=True, default=''),
        ),
        # 4. Make plant blank-able
        migrations.AlterField(
            model_name='ppsrreport',
            name='plant',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        # 5. Make lead_owner blank-able
        migrations.AlterField(
            model_name='ppsrreport',
            name='lead_owner',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        # 6. Make ppsr_no blank-able (drafts get temp numbers)
        migrations.AlterField(
            model_name='ppsrreport',
            name='ppsr_no',
            field=models.CharField(blank=True, max_length=30, unique=True),
        ),
        # 7. Add last_saved_step field
        migrations.AddField(
            model_name='ppsrreport',
            name='last_saved_step',
            field=models.PositiveSmallIntegerField(default=1),
        ),
    ]
