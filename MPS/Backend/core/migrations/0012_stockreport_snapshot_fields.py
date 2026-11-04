from django.db import migrations, models
from django.utils import timezone


def backfill_stock_dates(apps, schema_editor):
    StockReport = apps.get_model('core', 'StockReport')
    for row in StockReport.objects.all():
        fallback_date = row.created_at.date() if row.created_at else timezone.now().date()
        row.stock_date = fallback_date
        row.upload_date = fallback_date
        row.save(update_fields=['stock_date', 'upload_date'])


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_weekdefinition_month_weight'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='stockreport',
            options={'ordering': ['part_number', 'storage_location', '-stock_date'], 'verbose_name': 'Stock Report', 'verbose_name_plural': 'Stock Reports'},
        ),
        migrations.AddField(
            model_name='stockreport',
            name='stock_date',
            field=models.DateField(blank=True, db_index=True, default=timezone.now, help_text='Opening stock date (YYYY-MM-DD)', null=True),
        ),
        migrations.AddField(
            model_name='stockreport',
            name='upload_date',
            field=models.DateField(blank=True, db_index=True, default=timezone.now, help_text='Date MB52 upload was performed (YYYY-MM-DD)', null=True),
        ),
        migrations.AddField(
            model_name='stockreport',
            name='is_read_only',
            field=models.BooleanField(db_index=True, default=False, help_text='Set to true if superseded or locked prior to upload'),
        ),
        migrations.AddField(
            model_name='stockreport',
            name='is_previous_upload',
            field=models.BooleanField(db_index=True, default=False, help_text='True if this record was superseded/zeroed by a subsequent upload'),
        ),
        migrations.RunPython(backfill_stock_dates, reverse_backfill),
        migrations.RemoveConstraint(
            model_name='stockreport',
            name='unique_part_storage_location',
        ),
        migrations.AlterUniqueTogether(
            name='stockreport',
            unique_together={('part_number', 'storage_location', 'stock_date')},
        ),
        migrations.AddConstraint(
            model_name='stockreport',
            constraint=models.UniqueConstraint(fields=('part_number', 'storage_location', 'stock_date'), name='unique_part_storage_location_stock_date'),
        ),
        migrations.AddIndex(
            model_name='stockreport',
            index=models.Index(fields=['stock_date'], name='stock_repor_stock_d_95d0f3_idx'),
        ),
        migrations.AddIndex(
            model_name='stockreport',
            index=models.Index(fields=['upload_date'], name='stock_repor_upload__4bc418_idx'),
        ),
        migrations.AddIndex(
            model_name='stockreport',
            index=models.Index(fields=['is_previous_upload'], name='stock_repor_is_prev_2a4233_idx'),
        ),
    ]
