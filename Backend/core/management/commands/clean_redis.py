"""
Backend/core/management/commands/clean_redis.py
================================================
Management command to flush/clean all keys in Redis (both FakeRedis and real Redis)
and clear the Django cache.

Usage:
    python manage.py clean_redis
"""

from django.core.management.base import BaseCommand
from django.core.cache import cache
from core.fakeredis_pool import flush_fake_redis
from core.redis_client import get_redis


class Command(BaseCommand):
    help = 'Flushes all keys from Redis (FakeRedis / Standalone Redis) and clears Django Cache.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("[*] Cleaning Redis and Django Cache..."))

        # 1. Clear Django default cache
        try:
            cache.clear()
            self.stdout.write(self.style.SUCCESS("[OK] Cleared Django Cache (default)."))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"[!] Warning clearing Django cache: {e}"))

        # 2. Flush FakeRedis shared server
        try:
            flush_fake_redis()
            self.stdout.write(self.style.SUCCESS("[OK] Flushed In-Memory FakeRedis Server keyspace."))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"[!] Warning flushing FakeRedis: {e}"))

        # 3. Flush client connected via core.redis_client
        try:
            r = get_redis()
            r.flushall()
            self.stdout.write(self.style.SUCCESS("[OK] Flushed Redis Client keyspace."))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"[!] Note: Standalone Redis not reachable or already flushed ({e})"))

        self.stdout.write(self.style.SUCCESS("[SUCCESS] Redis and Cache have been completely cleaned!"))
