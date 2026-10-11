import re
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db.models.functions import Lower, Trim
from kaizens.models import Kaizen


class Command(BaseCommand):
    help = 'Analyzes and reports potential duplicate or variations of contributor names.'

    def handle(self, *args, **options):
        self.stdout.write('Analyzing contributor names...')

        kaizens = Kaizen.objects.exclude(idea_by__isnull=True).exclude(idea_by__exact='')
        raw_names = set(kaizens.values_list('idea_by', flat=True))

        # 1. Exact case-insensitive / trimmed duplicates
        exact_norm_map = defaultdict(set)
        for name in raw_names:
            key = name.strip().lower()
            exact_norm_map[key].add(name)

        duplicates = {k: v for k, v in exact_norm_map.items() if len(v) > 1}

        # 2. Base name normalization (stripping brackets like "(Operator)", symbols)
        def simplify(name):
            cleaned = re.sub(r'\(.*?\)', '', name)
            cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', cleaned)
            return ' '.join(cleaned.lower().split())

        base_map = defaultdict(set)
        for name in raw_names:
            bkey = simplify(name)
            if bkey:
                base_map[bkey].add(name)

        near_duplicates = {k: v for k, v in base_map.items() if len(v) > 1}

        self.stdout.write(f'Total distinct raw contributor strings: {len(raw_names)}')

        if duplicates:
            self.stdout.write(self.style.WARNING('\n[Exact Case/Whitespace Variations]:'))
            for key, group in duplicates.items():
                self.stdout.write(f'  - Key "{key}": {list(group)}')
        else:
            self.stdout.write('  No simple case/whitespace duplicates found.')

        if near_duplicates:
            self.stdout.write(self.style.WARNING('\n[Name Variations across designations/punctuation]:'))
            for key, group in near_duplicates.items():
                self.stdout.write(f'  - Base "{key}": {list(group)}')
        else:
            self.stdout.write('  No near-duplicate variations found.')
