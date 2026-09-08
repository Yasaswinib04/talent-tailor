"""The two startup migrations, which run against real customer data.

`startup` calls both on every boot, so the first deploy of the access model
rewrites the production database. Nothing else in the suite covers them, and
their failure modes are the expensive kind: a paying workspace losing what it
bought, or a restart loop handing out a free month per boot.

Runs against an in-memory Mongo — no server, no database, no API key.
"""
import asyncio
from datetime import datetime, timedelta, timezone

import pytest

import server


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture()
def db():
    """An empty database, standing in for one that predates the access model."""
    from mongomock_motor import AsyncMongoMockClient
    server.client = AsyncMongoMockClient()
    server.db = server.client["test"]
    return server.db


def iso(dt):
    return dt.isoformat().replace("+00:00", "Z")


def until_of(uid):
    user = _run(server.db.users.find_one({"id": uid}))
    return datetime.fromisoformat(user["access_until"].replace("Z", "+00:00"))


# ---------- _backfill_trials ----------
def test_backfill_gives_pre_access_model_accounts_a_trial(db):
    """Someone who signed up yesterday must not open the app to a paywall."""
    _run(db.users.insert_many([
        {"id": "u1", "email": "a@x.com"},                 # no access_until at all
        {"id": "u2", "email": "b@x.com", "access_until": ""},
        {"id": "u3", "email": "c@x.com", "access_until": None},
    ]))
    _run(server._backfill_trials())

    for uid in ("u1", "u2", "u3"):
        user = _run(db.users.find_one({"id": uid}))
        assert server._has_access(user) is True, f"{uid} was left locked out"


def test_backfill_does_not_touch_an_account_that_already_has_access(db):
    """It must not shorten a paying customer, nor extend one for free."""
    existing = iso(datetime.now(timezone.utc) + timedelta(days=300))
    _run(db.users.insert_one({"id": "paid", "email": "p@x.com", "access_until": existing}))
    _run(server._backfill_trials())
    assert _run(db.users.find_one({"id": "paid"}))["access_until"] == existing


def test_backfill_is_idempotent_across_restarts(db):
    _run(db.users.insert_one({"id": "u1", "email": "a@x.com"}))
    _run(server._backfill_trials())
    first = until_of("u1")
    _run(server._backfill_trials())
    assert until_of("u1") == first, "a restart moved the trial expiry"


# ---------- _migrate_unlocked_jobs_to_access ----------
@pytest.fixture()
def paid_workspace(db):
    """A workspace that bought one role under the old ₹1,999 per-role model."""
    _run(db.users.insert_one({"id": "owner", "email": "o@x.com"}))
    _run(db.jobs.insert_many([
        {"id": "job-paid", "owner_id": "owner", "unlocked": True},
        {"id": "job-free", "owner_id": "owner", "unlocked": False},
    ]))
    _run(db.candidates.insert_many([
        {"id": "c1", "owner_id": "owner", "role_ids": ["job-paid"]},
        {"id": "c2", "owner_id": "owner", "role_ids": ["job-paid"]},
        {"id": "c3", "owner_id": "owner", "role_ids": ["job-free"]},
    ]))
    return db


def test_a_paid_role_carries_over_to_permanent_reveals(paid_workspace):
    """They paid to see these people. Nothing visible yesterday may be hidden
    today, and it must stay visible after the granted days run out."""
    _run(server._migrate_unlocked_jobs_to_access())
    user = _run(server.db.users.find_one({"id": "owner"}))
    revealed = set(user.get("revealed_candidate_ids") or [])
    assert {"c1", "c2"} <= revealed, "candidates on a paid role were not carried over"
    assert "c3" not in revealed, "a candidate from an unpaid role was revealed for free"


def test_migration_grants_a_plans_worth_of_days(paid_workspace):
    _run(server._migrate_unlocked_jobs_to_access())
    user = _run(server.db.users.find_one({"id": "owner"}))
    assert server._has_access(user) is True
    granted = (until_of("owner") - datetime.now(timezone.utc)).days
    assert granted >= PLAN_DAYS - 1, f"migration granted only {granted} days"


PLAN_DAYS = server.PLANS[server.DEFAULT_PLAN]["days"]


def test_migration_cannot_grant_twice_across_restarts(paid_workspace):
    """The claim is atomic and flagged on the user. Without that, every boot of
    a crash-looping instance would hand out another month."""
    _run(server._migrate_unlocked_jobs_to_access())
    first = until_of("owner")
    for _ in range(5):
        _run(server._migrate_unlocked_jobs_to_access())
    assert until_of("owner") == first, "a restart granted another plan's worth of days"


def test_migration_skips_jobs_with_no_owner(db):
    """Orphaned rows must not crash startup — a failed migration means the app
    does not boot at all."""
    _run(db.jobs.insert_one({"id": "orphan", "owner_id": "", "unlocked": True}))
    _run(server._migrate_unlocked_jobs_to_access())  # no exception == pass


def test_migration_is_a_no_op_on_a_database_with_no_unlocked_jobs(db):
    _run(db.users.insert_one({"id": "u1", "email": "a@x.com"}))
    _run(server._migrate_unlocked_jobs_to_access())
    user = _run(db.users.find_one({"id": "u1"}))
    assert not user.get("access_until"), "a workspace that never paid was granted access"
    assert "access_migrated_at" not in user
