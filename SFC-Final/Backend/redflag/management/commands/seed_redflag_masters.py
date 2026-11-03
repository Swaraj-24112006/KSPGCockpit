from django.core.management.base import BaseCommand
from redflag.models import Department, Plant, RedFlagConfig

class Command(BaseCommand):
    help = "Seeds initial Red Flag master data (Departments, Plants, Config) idempotently without duplicating."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding Red Flag Master Data..."))

        # 1. Departments per C1
        # Production, Quality, Maintenance, Safety & EHS, Logistics & Stores, Tooling & Die, Engineering, Supplier / Inward
        departments_spec = [
            {'code': 'PROD', 'name': 'Production', 'can_originate': True, 'can_be_target': True, 'sort_order': 1},
            {'code': 'QA', 'name': 'Quality', 'can_originate': True, 'can_be_target': True, 'sort_order': 2},
            {'code': 'MAINT', 'name': 'Maintenance', 'can_originate': True, 'can_be_target': True, 'sort_order': 3},
            {'code': 'EHS', 'name': 'Safety & EHS', 'can_originate': True, 'can_be_target': True, 'sort_order': 4},
            {'code': 'LOG', 'name': 'Logistics & Stores', 'can_originate': True, 'can_be_target': True, 'sort_order': 5},
            {'code': 'TOOL', 'name': 'Tooling & Die', 'can_originate': True, 'can_be_target': True, 'sort_order': 6},
            {'code': 'ENG', 'name': 'Engineering', 'can_originate': True, 'can_be_target': True, 'sort_order': 7},
            {'code': 'SUPP', 'name': 'Supplier / Inward', 'can_originate': True, 'can_be_target': True, 'sort_order': 8},
        ]

        for dept_data in departments_spec:
            dept, created = Department.objects.update_or_create(
                code=dept_data['code'],
                defaults=dept_data
            )
            action = "Created" if created else "Updated"
            self.stdout.write(f"  [{action}] Department: {dept.name} ({dept.code})")

        # 2. Plants per C1
        # Plant code: MF1, name: Assembly & Testing
        plants_spec = [
            {
                'code': 'MF1',
                'name': 'Assembly & Testing',
                'description': 'Assembly & Testing Plant',
                'default_quarantine_location': 'Quarantine Bay MF1-Q1'
            },
            {
                'code': 'MF2',
                'name': 'Machining & CNC',
                'description': 'Machining & CNC Facility',
                'default_quarantine_location': 'Quarantine Area CNC-Q02'
            },
            {
                'code': 'MF3',
                'name': 'Moulding & Tooling',
                'description': 'Moulding & Tooling Division',
                'default_quarantine_location': 'Quarantine Bay MLD-Q01'
            },
        ]

        for p_data in plants_spec:
            plant, created = Plant.objects.update_or_create(
                code=p_data['code'],
                defaults=p_data
            )
            action = "Created" if created else "Updated"
            self.stdout.write(f"  [{action}] Plant: {plant.code} - {plant.name}")

        # 3. Default RedFlagConfig
        config = RedFlagConfig.get_config()
        self.stdout.write(self.style.SUCCESS(f"  [OK] RedFlagConfig verified: {config}"))
        self.stdout.write(self.style.SUCCESS("Red Flag Master Data seeding complete!"))

