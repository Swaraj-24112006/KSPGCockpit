import csv
import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from kaizens.models import Department, AnnualHeadcount, LegacyYearlySummary, Kaizen
from kaizens.analytics.constants import DEFAULT_DEPARTMENTS, DEPARTMENT_CODE_NORMALIZATION


class Command(BaseCommand):
    help = 'Seeds departments, annual headcounts, legacy yearly summaries, or imports from CSV.'

    def add_arguments(self, parser):
        parser.add_argument('--csv', type=str, help='Path to legacy history CSV file')

    def handle(self, *args, **options):
        csv_path = options.get('csv')

        # 1. Seed Departments
        self.stdout.write('Seeding Departments...')
        for dept_data in DEFAULT_DEPARTMENTS:
            dept, created = Department.objects.update_or_create(
                code=dept_data['code'],
                defaults={
                    'display_name': dept_data['display_name'],
                    'description': dept_data['description'],
                    'color': dept_data['color'],
                    'sort_order': dept_data['sort_order'],
                }
            )
            state = 'Created' if created else 'Updated'
            self.stdout.write(f'  {state} department {dept.code} - {dept.display_name}')

        # 2. Normalize existing Kaizen mini_factory strings
        self.stdout.write('Normalizing existing Kaizen mini_factory strings...')
        updated_count = 0
        for k in Kaizen.objects.all():
            mf_raw = (k.mini_factory or '').strip()
            mf_lower = mf_raw.lower()
            if mf_lower in DEPARTMENT_CODE_NORMALIZATION:
                normalized_code = DEPARTMENT_CODE_NORMALIZATION[mf_lower]
                if k.mini_factory != normalized_code:
                    k.mini_factory = normalized_code
                    k.save(update_fields=['mini_factory'])
                    updated_count += 1
        self.stdout.write(f'  Normalized {updated_count} Kaizen records.')

        # 3. CSV Import or Default Benchmark Seed
        if csv_path and os.path.exists(csv_path):
            self.stdout.write(f'Importing legacy history from {csv_path}...')
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    year = int(row['year'])
                    kaizens_count = int(row.get('kaizens', 0))
                    savings = Decimal(str(row.get('savings', 0)))
                    headcount = int(row['headcount']) if row.get('headcount') else None

                    LegacyYearlySummary.objects.update_or_create(
                        year=year,
                        defaults={
                            'kaizens': kaizens_count,
                            'savings': savings,
                            'headcount': headcount,
                        }
                    )
                    if headcount:
                        AnnualHeadcount.objects.update_or_create(
                            year=year,
                            defaults={'headcount': headcount}
                        )
            self.stdout.write(self.style.SUCCESS('Successfully imported from CSV.'))
        else:
            self.stdout.write('Seeding default benchmark legacy data (2021–2024) and headcounts...')
            benchmarks = [
                {'year': 2021, 'kaizens': 360, 'savings': Decimal('658071'), 'headcount': 319},
                {'year': 2022, 'kaizens': 379, 'savings': Decimal('710238'), 'headcount': 332},
                {'year': 2023, 'kaizens': 442, 'savings': Decimal('834458'), 'headcount': 375},
                {'year': 2024, 'kaizens': 441, 'savings': Decimal('896448'), 'headcount': 329},
            ]
            for b in benchmarks:
                LegacyYearlySummary.objects.update_or_create(
                    year=b['year'],
                    defaults={
                        'kaizens': b['kaizens'],
                        'savings': b['savings'],
                        'headcount': b['headcount'],
                    }
                )
                AnnualHeadcount.objects.update_or_create(
                    year=b['year'],
                    defaults={'headcount': b['headcount']}
                )

            # Also seed 2025 and 2026 headcounts
            AnnualHeadcount.objects.update_or_create(year=2025, defaults={'headcount': 298})
            AnnualHeadcount.objects.update_or_create(year=2026, defaults={'headcount': 300})

            self.stdout.write(self.style.SUCCESS('Successfully seeded legacy history and headcounts.'))
