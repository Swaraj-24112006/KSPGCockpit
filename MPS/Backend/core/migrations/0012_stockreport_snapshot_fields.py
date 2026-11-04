from django.db import migrations, models
from django.utils import timezone


class SafeAddField(migrations.AddField):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        connection = schema_editor.connection
        table_name = to_state.apps.get_model(app_label, self.model_name)._meta.db_table
        with connection.cursor() as cursor:
            table_desc = connection.introspection.get_table_description(cursor, table_name)
            existing_cols = {col.name for col in table_desc}
        if self.name in existing_cols:
            return
        super().database_forwards(app_label, schema_editor, from_state, to_state)


class SafeRemoveConstraint(migrations.RemoveConstraint):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        connection = schema_editor.connection
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM pg_constraint WHERE conname = %s",
                    [self.name]
                )
                if not cursor.fetchone():
                    return
        try:
            super().database_forwards(app_label, schema_editor, from_state, to_state)
        except Exception:
            pass


class SafeAddConstraint(migrations.AddConstraint):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        connection = schema_editor.connection
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM pg_constraint WHERE conname = %s",
                    [self.constraint.name]
                )
                if cursor.fetchone():
                    return
        try:
            super().database_forwards(app_label, schema_editor, from_state, to_state)
        except Exception:
            pass


class SafeAlterUniqueTogether(migrations.AlterUniqueTogether):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        try:
            super().database_forwards(app_label, schema_editor, from_state, to_state)
        except Exception:
            pass


class SafeAddIndex(migrations.AddIndex):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        connection = schema_editor.connection
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM pg_class WHERE relname = %s",
                    [self.index.name]
                )
                if cursor.fetchone():
                    return
        try:
            super().database_forwards(app_label, schema_editor, from_state, to_state)
        except Exception:
            pass


def backfill_stock_dates(apps, schema_editor):
    StockReport = apps.get_model('core', 'StockReport')
    try:
        for row in StockReport.objects.filter(stock_date__isnull=True):
            fallback_date = row.created_at.date() if row.created_at else timezone.now().date()
            row.stock_date = fallback_date
            if not getattr(row, 'upload_date', None):
                row.upload_date = fallback_date
            row.save(update_fields=['stock_date', 'upload_date'])
    except Exception:
        pass


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
        SafeAddField(
            model_name='stockreport',
            name='stock_date',
            field=models.DateField(blank=True, db_index=True, default=timezone.now, help_text='Opening stock date (YYYY-MM-DD)', null=True),
        ),
        SafeAddField(
            model_name='stockreport',
            name='upload_date',
            field=models.DateField(blank=True, db_index=True, default=timezone.now, help_text='Date MB52 upload was performed (YYYY-MM-DD)', null=True),
        ),
        SafeAddField(
            model_name='stockreport',
            name='is_read_only',
            field=models.BooleanField(db_index=True, default=False, help_text='Set to true if superseded or locked prior to upload'),
        ),
        SafeAddField(
            model_name='stockreport',
            name='is_previous_upload',
            field=models.BooleanField(db_index=True, default=False, help_text='True if this record was superseded/zeroed by a subsequent upload'),
        ),
        migrations.RunPython(backfill_stock_dates, reverse_backfill),
        SafeRemoveConstraint(
            model_name='stockreport',
            name='unique_part_storage_location',
        ),
        SafeAlterUniqueTogether(
            name='stockreport',
            unique_together={('part_number', 'storage_location', 'stock_date')},
        ),
        SafeAddConstraint(
            model_name='stockreport',
            constraint=models.UniqueConstraint(fields=('part_number', 'storage_location', 'stock_date'), name='unique_part_storage_location_stock_date'),
        ),
        SafeAddIndex(
            model_name='stockreport',
            index=models.Index(fields=['stock_date'], name='stock_repor_stock_d_95d0f3_idx'),
        ),
        SafeAddIndex(
            model_name='stockreport',
            index=models.Index(fields=['upload_date'], name='stock_repor_upload__4bc418_idx'),
        ),
        SafeAddIndex(
            model_name='stockreport',
            index=models.Index(fields=['is_previous_upload'], name='stock_repor_is_prev_2a4233_idx'),
        ),
    ]
