"""
core/fakeredis_pool.py — Shared FakeRedis Server & Connection Factory
====================================================================
Provides an in-memory Redis emulation using `fakeredis` for local
development, testing, caching, sessions, and rate limiting without
requiring an external standalone Redis daemon.
"""

import logging
import fakeredis
from django_redis.pool import ConnectionFactory

logger = logging.getLogger(__name__)

# Single process-wide FakeServer instance to ensure all connections
# (django cache, sessions, rate limits, custom clients) share the exact same keyspace
_SHARED_FAKE_SERVER = fakeredis.FakeServer()


def get_fake_server() -> fakeredis.FakeServer:
    """Return the singleton FakeServer instance."""
    return _SHARED_FAKE_SERVER


def get_fake_redis_client(decode_responses: bool = True) -> fakeredis.FakeRedis:
    """Return a FakeRedis client connected to the shared FakeServer."""
    return fakeredis.FakeRedis(server=_SHARED_FAKE_SERVER, decode_responses=decode_responses)


class FakeRedisConnectionFactory(ConnectionFactory):
    """
    ConnectionFactory for django-redis that provides FakeRedis instances
    connected to the singleton FakeServer.
    """
    def __init__(self, options=None):
        self.options = options or {}

    def make_connection_params(self, url):
        return {"url": url}

    def get_connection(self, params):
        return fakeredis.FakeRedis(server=_SHARED_FAKE_SERVER, decode_responses=False)

    def connect(self, url: str):
        return fakeredis.FakeRedis(server=_SHARED_FAKE_SERVER, decode_responses=False)

    def disconnect(self, connection):
        pass

    def get_or_create_connection_pool(self, params):
        return None


def flush_fake_redis():
    """Flush all keys in the shared FakeServer."""
    client = get_fake_redis_client(decode_responses=False)
    client.flushall()
    logger.info("FakeRedis server flushed successfully.")
