"""
Management Command: warm_ppsr_cache
====================================
Pre-fills Redis cache for PPSR summary and leaderboard endpoints on startup
or deployment to eliminate cold-cache database latency.
"""

from datetime import datetime
from django.core.management.base import BaseCommand
from django.db.models import Count, Sum, Q
from ppsr.models import PpsrReport
from ppsr.services import get_award_leaderboard
from ppsr.cache import (
    cache_set,
    summary_key,
    leaderboard_key,
    TTL_SUMMARY,
    TTL_LEADERBOARD,
)


class Command(BaseCommand):
    help = 'Pre-warm PPSR Redis cache after deployment or server restart'

    def handle(self, *args, **options):
        self.stdout.write('Warming PPSR cache...')

        # 1. Warm summary
        stats = PpsrReport.objects.exclude(status='Archived').aggregate(
            total=Count('id'),
            open_count=Count('id', filter=Q(status='Open')),
            in_progress_count=Count('id', filter=Q(status='In-Progress')),
            closed_count=Count('id', filter=Q(status='Closed')),
            total_cost_save_per_month=Sum('cost_save_per_month'),
            total_cost_save_per_annum=Sum('cost_save_per_annum'),
            repeat_cases_count=Count('id', filter=Q(repeat_case='yes')),
            std_completed_count=Count('id', filter=Q(std_status_mf='Completed')),
            total_monthly_savings=Sum('cost_save_per_month'),
            total_annual_savings=Sum('cost_save_per_annum'),
            repeat_cases=Count('id', filter=Q(repeat_case='yes')),
            std_completed=Count('id', filter=Q(std_status_mf='Completed')),
            pending_decision=Count('id', filter=Q(committee_decision='In Review')),
        )
        summary_data = {
            'total_count': stats['total'] or 0,
            'total': stats['total'] or 0,
            'open_count': stats['open_count'] or 0,
            'in_progress_count': stats['in_progress_count'] or 0,
            'closed_count': stats['closed_count'] or 0,
            'total_cost_save_per_month': float(stats['total_cost_save_per_month'] or 0),
            'total_cost_save_per_annum': float(stats['total_cost_save_per_annum'] or 0),
            'total_monthly_savings': float(stats['total_monthly_savings'] or 0),
            'total_annual_savings': float(stats['total_annual_savings'] or 0),
            'repeat_cases_count': stats['repeat_cases_count'] or 0,
            'repeat_cases': stats['repeat_cases'] or 0,
            'std_completed_count': stats['std_completed_count'] or 0,
            'std_completed': stats['std_completed'] or 0,
            'pending_decision': stats['pending_decision'] or 0,
        }
        cache_set(summary_key(), summary_data, TTL_SUMMARY)
        self.stdout.write(self.style.SUCCESS('  [OK] Summary cache warmed'))

        # 2. Warm leaderboard for current year & month
        now = datetime.now()
        year = str(now.year)
        months = ['All', now.strftime('%B'), f'{now.month:02d}']

        CATEGORIES = ['Overall', 'RedX', 'CostFTQ', 'MF1', 'MF2', 'MF3', 'Machining']
        for month in months:
            ranked_list = get_award_leaderboard(year=year, month=month, category='All', status='All')
            all_categories = list(dict.fromkeys(CATEGORIES + [r['category'] for r in ranked_list]))

            grouped_categories = {}
            for cat in all_categories:
                if cat == 'Overall':
                    cat_items = sorted(ranked_list, key=lambda x: x['total_score'], reverse=True)
                else:
                    cat_items = [r for r in ranked_list if r['category'].lower() == cat.lower()]
                winner = cat_items[0] if cat_items else None
                grouped_categories[cat] = {
                    'winner': winner,
                    'rankings': cat_items,
                    'count': len(cat_items)
                }

            leaderboard_data = {
                'year': year,
                'month': month,
                'category': 'All',
                'status': 'All',
                'leaderboard': ranked_list,
                'categories': grouped_categories,
                'total_evaluated': len(ranked_list)
            }
            cache_set(leaderboard_key(year, month, 'All', 'All'), leaderboard_data, TTL_LEADERBOARD)

        self.stdout.write(self.style.SUCCESS('  [OK] Leaderboard cache warmed'))
        self.stdout.write(self.style.SUCCESS('PPSR cache warm complete.'))
