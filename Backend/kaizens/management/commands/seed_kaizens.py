import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from kaizens.models import Kaizen, KaizenBenefit

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds initial kaizens'

    def handle(self, *args, **kwargs):
        admin = User.objects.filter(is_superuser=True).first()
        if not admin:
            self.stdout.write(self.style.ERROR('No admin user found. Run seed_users first.'))
            return

        kaizens_data = [
            {
                'month': 'June',
                'suggestion_date': datetime.date(2024, 6, 12),
                'title': 'Optimization of cooling water flow',
                'problem_before': 'Excessive water consumption due to unoptimized valve settings',
                'counter_measure_after': 'Installed automated flow control valves',
                'area': 'Utilities',
                'mini_factory': 'MF-1',
                'location': 'Cooling Tower B',
                'machine': 'Pump 4',
                'cost_save': 45000.00,
                'idea_by': 'John Doe',
                'status': 'closed',
                'classification': 'kaizen',
            },
            {
                'month': 'July',
                'suggestion_date': datetime.date(2024, 7, 5),
                'title': 'Ergonomic workbench adjustment',
                'problem_before': 'Operators experiencing back pain due to low bench height',
                'counter_measure_after': 'Installed height-adjustable workbenches',
                'area': 'Assembly',
                'mini_factory': 'MF-2',
                'location': 'Line 3',
                'machine': 'Assembly Station',
                'cost_save': 0.00,
                'idea_by': 'Jane Smith',
                'status': 'approved',
                'classification': 'good_point',
            },
            {
                'month': 'August',
                'suggestion_date': datetime.date(2024, 8, 20),
                'title': 'Scrap reduction in cutting process',
                'problem_before': 'High scrap rate (5%) during raw material cutting',
                'counter_measure_after': 'Optimized nesting algorithm in CNC software',
                'area': 'Machining',
                'mini_factory': 'MF-1',
                'location': 'CNC Bay',
                'machine': 'CNC Router 2',
                'cost_save': 120000.00,
                'idea_by': 'Mike Johnson',
                'status': 'submitted',
                'classification': 'pending',
            },
        ]

        for k_data in kaizens_data:
            kaizen, created = Kaizen.objects.get_or_create(
                title=k_data['title'],
                defaults={
                    'sr_no': Kaizen.generate_sr_no(),
                    'month': k_data['month'],
                    'suggestion_date': k_data['suggestion_date'],
                    'problem_before': k_data['problem_before'],
                    'counter_measure_after': k_data['counter_measure_after'],
                    'area': k_data['area'],
                    'mini_factory': k_data['mini_factory'],
                    'location': k_data['location'],
                    'machine': k_data['machine'],
                    'cost_save': k_data['cost_save'],
                    'idea_by': k_data['idea_by'],
                    'status': k_data['status'],
                    'classification': k_data['classification'],
                    'created_by': admin,
                }
            )

            if created:
                KaizenBenefit.objects.create(
                    kaizen=kaizen,
                    productivity=True,
                    cost=k_data['cost_save'] > 0
                )
                self.stdout.write(self.style.SUCCESS(f'Created kaizen: {kaizen.sr_no}'))
            else:
                self.stdout.write(f'Kaizen {kaizen.sr_no} already exists')

        self.stdout.write(self.style.SUCCESS('Successfully seeded kaizens'))
