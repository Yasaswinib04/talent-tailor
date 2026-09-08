"""Shared test harness.

Everything here runs against an in-memory Mongo (`mongomock_motor`), so the
suite needs no database and no running server — `pytest backend/tests` works on
a clean checkout. `backend_test.py` is the exception: it drives a live instance
over HTTP and skips itself when there isn't one.

The app is multi-tenant: every query is scoped by `owner_id`, and every
recruiter endpoint takes a bearer token. So the `client` fixture signs a real
account up through the real endpoint rather than forging a token — that way a
change to the auth scheme surfaces here instead of silently passing.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-not-used-anywhere-real")
# The LLM path is off in tests on purpose: it needs a network call and a key,
# and the deterministic fallback is what we actually want to pin down.
os.environ.pop("OPENROUTER_API_KEY", None)

from mongomock_motor import AsyncMongoMockClient  # noqa: E402
import motor.motor_asyncio as motor_asyncio  # noqa: E402

motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

TEST_USER = {
    "name": "Maya Rao",
    "email": "maya@example.com",
    "company": "Example",
    "password": "correct horse battery staple",
}


def _fresh_db():
    """A new in-memory database per test — no state leaks between them."""
    server.client = AsyncMongoMockClient()
    server.db = server.client["test"]
    if hasattr(server, "_bulk_batch_log"):
        server._bulk_batch_log.clear()


@pytest.fixture()
def client():
    """Signed-in recruiter with an empty workspace."""
    _fresh_db()
    with TestClient(server.app, raise_server_exceptions=False) as c:
        r = c.post("/api/auth/signup", json=TEST_USER)
        assert r.status_code == 200, f"test signup failed: {r.text}"
        c.headers["Authorization"] = f"Bearer {r.json()['token']}"
        yield c


@pytest.fixture()
def seeded(client):
    """Signed-in recruiter whose workspace has the sample roles and candidates.

    Several behaviours (filter previews, funnel counts, role deletion) only mean
    anything against a populated pool.
    """
    r = client.post("/api/sample-data")
    assert r.status_code == 200, f"sample data failed: {r.text}"
    return client


@pytest.fixture()
def second_client():
    """A *different* recruiter against the same database.

    Used to prove tenancy: one account must never see another's candidates.
    Depends on nothing, so compose it with `client` in the same test.
    """
    with TestClient(server.app, raise_server_exceptions=False) as c:
        r = c.post("/api/auth/signup", json={**TEST_USER, "email": "other@example.com"})
        assert r.status_code == 200, f"second signup failed: {r.text}"
        c.headers["Authorization"] = f"Bearer {r.json()['token']}"
        yield c


def make_job(client, **overrides):
    """Create a role and return it. Keeps the tests about behaviour, not payloads."""
    payload = {
        "title": "Senior Frontend Engineer",
        "department": "Engineering",
        "location": "Bengaluru",
        "jd": "React, TypeScript and GraphQL. 5+ years building production web apps.",
        "salary_min": 3500000,
        "salary_max": 6500000,
        **overrides,
    }
    r = client.post("/api/jobs", json=payload)
    assert r.status_code == 200, f"job create failed: {r.text}"
    return r.json()
