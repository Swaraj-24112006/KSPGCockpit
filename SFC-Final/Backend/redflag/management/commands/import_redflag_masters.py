import os
import csv
from django.core.management.base import BaseCommand, CommandError
from redflag.models import Employee, Line, Station, ProductModel, Department, Plant

class Command(BaseCommand):
    help = "Import master data from CSV (upsert by natural key)."

    def add_arguments(self, parser):
        parser.add_argument('file', type=str, help='Path to the CSV file')
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument('--employees', action='store_true', help='Import Employees')
        group.add_argument('--lines', action='store_true', help='Import Lines')
        group.add_argument('--stations', action='store_true', help='Import Stations')
        group.add_argument('--models', action='store_true', help='Import Product Models')

    def handle(self, *args, **options):
        file_path = options['file']
        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")

        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            if options['employees']:
                self.import_employees(reader)
            elif options['lines']:
                self.import_lines(reader)
            elif options['stations']:
                self.import_stations(reader)
            elif options['models']:
                self.import_models(reader)

    def import_employees(self, reader):
        count = 0
        for row in reader:
            code = row['employee_code'].strip()
            full_name = row['full_name'].strip()
            designation = row['designation'].strip()
            dept_name = row['department'].strip()
            plant_code = row.get('plant_code', '').strip()

            department = Department.objects.filter(name__iexact=dept_name).first()
            if not department:
                department, _ = Department.objects.get_or_create(code=dept_name[:10].upper(), defaults={'name': dept_name})

            plant = None
            if plant_code:
                plant = Plant.objects.filter(code__iexact=plant_code).first()

            Employee.objects.update_or_create(
                employee_code=code,
                defaults={
                    'full_name': full_name,
                    'designation': designation,
                    'department': department,
                    'plant': plant,
                    'email': row.get('email', '').strip(),
                    'phone': row.get('phone', '').strip(),
                    'is_active': row.get('is_active', 'true').strip().lower() in ('true', '1', 'yes'),
                }
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Successfully processed {count} employees."))

    def import_lines(self, reader):
        count = 0
        for row in reader:
            plant_code = row['plant_code'].strip()
            name = row['name'].strip()
            plant = Plant.objects.filter(code__iexact=plant_code).first()
            if not plant:
                raise CommandError(f"Plant not found for code: {plant_code}")

            Line.objects.update_or_create(
                plant=plant,
                name=name,
                defaults={'is_active': row.get('is_active', 'true').strip().lower() in ('true', '1', 'yes')}
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Successfully processed {count} lines."))

    def import_stations(self, reader):
        count = 0
        for row in reader:
            plant_code = row['plant_code'].strip()
            line_name = row['line_name'].strip()
            name = row['name'].strip()

            line = Line.objects.filter(plant__code__iexact=plant_code, name__iexact=line_name).first()
            if not line:
                raise CommandError(f"Line not found: {line_name} in plant {plant_code}")

            Station.objects.update_or_create(
                line=line,
                name=name,
                defaults={'is_active': row.get('is_active', 'true').strip().lower() in ('true', '1', 'yes')}
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Successfully processed {count} stations."))

    def import_models(self, reader):
        count = 0
        for row in reader:
            name = row['name'].strip()
            ProductModel.objects.update_or_create(
                name=name,
                defaults={'is_active': row.get('is_active', 'true').strip().lower() in ('true', '1', 'yes')}
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Successfully processed {count} product models."))

