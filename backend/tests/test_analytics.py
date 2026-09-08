"""Unit tests for analytics capture.

Unlike backend_test.py these need no running API and no database — they stand
up a throwaway HTTP server and point PostHog at it.

The property worth protecting: analytics must never break a request. If a
future change makes capture() raise, or blocks on a dead PostHog, that turns a
missing data point into a failed signup. These tests fail loudly if that
happens.
"""
import asyncio
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread

import pytest

import analytics


@pytest.fixture
def posthog():
    """A stand-in PostHog that records what it receives."""
    received = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            received.append(json.loads(self.rfile.read(length)))
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"{}")

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    Thread(target=server.serve_forever, daemon=True).start()

    prev_key, prev_host = analytics.POSTHOG_API_KEY, analytics.POSTHOG_HOST
    analytics.POSTHOG_API_KEY = "phc_test_key"
    analytics.POSTHOG_HOST = f"http://127.0.0.1:{server.server_port}"
    yield received
    analytics.POSTHOG_API_KEY, analytics.POSTHOG_HOST = prev_key, prev_host
    server.shutdown()


def test_disabled_without_key(monkeypatch):
    monkeypatch.setattr(analytics, "POSTHOG_API_KEY", "")
    assert not analytics.enabled()
    analytics.capture("user-1", "signed_up")  # must be a silent no-op


def test_no_event_loop_is_a_no_op(monkeypatch):
    """Called from a sync context (a script, a migration) there's no loop to
    schedule on. Drop the event rather than raising."""
    monkeypatch.setattr(analytics, "POSTHOG_API_KEY", "phc_test_key")
    analytics.capture("user-1", "signed_up")


def test_capture_sends_expected_payload(posthog):
    async def go():
        analytics.capture("user-1", "job_created", jobs_total=3)
        await asyncio.sleep(0.5)

    asyncio.run(go())

    assert len(posthog) == 1
    body = posthog[0]
    assert body["api_key"] == "phc_test_key"
    assert body["event"] == "job_created"
    assert body["distinct_id"] == "user-1"
    assert body["properties"]["jobs_total"] == 3


def test_identify_sets_person_properties(posthog):
    async def go():
        analytics.identify("user-1", company="Acme")
        await asyncio.sleep(0.5)

    asyncio.run(go())
    assert posthog[0]["event"] == "$identify"
    assert posthog[0]["properties"]["$set"] == {"company": "Acme"}


def test_tasks_are_held_then_released(posthog):
    """asyncio keeps only a weak reference to a bare task, so without the
    module's _inflight set a capture can be garbage-collected mid-flight."""

    async def go():
        analytics.capture("user-1", "signed_up")
        assert len(analytics._inflight) == 1
        await asyncio.sleep(0.5)
        assert not analytics._inflight  # released once done

    asyncio.run(go())


def test_unreachable_posthog_never_raises(posthog):
    """The one that matters: a dead PostHog must not surface to the caller."""
    analytics.POSTHOG_HOST = "http://127.0.0.1:9"  # discard port

    async def go():
        analytics.capture("user-1", "signed_up")
        await asyncio.sleep(0.5)

    asyncio.run(go())  # no exception == pass
    assert posthog == []
