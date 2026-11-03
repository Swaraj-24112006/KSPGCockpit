from django.db import migrations

def create_roles_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    groups = ['rf_quality_custodian', 'rf_plant_head', 'rf_target_person']
    for group_name in groups:
        Group.objects.get_or_create(name=group_name)

def remove_roles_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    groups = ['rf_quality_custodian', 'rf_plant_head', 'rf_target_person']
    Group.objects.filter(name__in=groups).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('redflag', '0001_initial'),
        ('auth', '__latest__'),
    ]

    operations = [
        migrations.RunPython(create_roles_groups, reverse_code=remove_roles_groups),
    ]

