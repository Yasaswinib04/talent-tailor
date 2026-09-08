"""The paywall, pinned.

These live here rather than in `backend_test.py` for a structural reason: that
file drives a live server over HTTP, and every workspace it can create has a
14-day trial. A workspace with an *expired* plan is the only state in which
redaction is observable, and there is deliberately no endpoint that revokes
access — so it can only be set up by reaching into the database, which the
hermetic in-memory harness allows and an HTTP client pointed at production must
never do.

`07954d1` replaced the per-role unlock with workspace-wide time-boxed access and
left the old paywall tests behind; they had been failing ever since, which meant
the revenue path shipped with no passing coverage. This file is that coverage.

Runs against an in-memory Mongo — no server, no database, no API key.
"""
import asyncio
from datetime import datetime, timedelta, timezone

import pytest

import server
from conftest import make_job

IDENTITY_FIELDS = ("email", "phone")


def _run(coro):
    return asyncio.run(coro)


def lapse(email="maya@example.com", days_ago=1):
    """Expire this workspace's plan. There is no endpoint for it on purpose."""
    when = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat().replace("+00:00", "Z")
    _run(server.db.users.update_one({"email": email}, {"$set": {"access_until": when}}))


def read_user(email="maya@example.com"):
    return _run(server.db.users.find_one({"email": email}))


def candidates(client, **params):
    r = client.get("/api/candidates", params=params)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- The trial ----------
def test_signup_grants_a_trial(client):
    """Full access from signup, no card. At zero users the bottleneck is proof."""
    user = read_user()
    assert user.get("access_until"), "a new workspace got no trial"
    assert server._has_access(user) is True

    r = client.get("/api/billing/config")
    assert r.status_code == 200
    assert r.json()["has_access"] is True


def test_trial_expiry_is_parsed_not_string_compared(client):
    """now_iso() and grant_access() write different ISO spellings ("+00:00" vs
    "Z"). A lexical compare on mixed spellings grants access indefinitely."""
    _run(server.db.users.update_one(
        {"email": "maya@example.com"},
        {"$set": {"access_until": "2020-01-01T00:00:00+00:00"}},
    ))
    assert server._has_access(read_user()) is False

    _run(server.db.users.update_one(
        {"email": "maya@example.com"},
        {"$set": {"access_until": "2020-01-01T00:00:00Z"}},
    ))
    assert server._has_access(read_user()) is False


def test_unparseable_expiry_denies_rather_than_crashes(client):
    _run(server.db.users.update_one(
        {"email": "maya@example.com"}, {"$set": {"access_until": "not-a-date"}}
    ))
    assert server._has_access(read_user()) is False


# ---------- Redaction while lapsed ----------
def test_lapsed_workspace_sees_a_capped_preview_and_nothing_more(seeded):
    lapse()
    all_c = candidates(seeded)
    visible = [c for c in all_c if not c.get("locked")]
    locked = [c for c in all_c if c.get("locked")]

    assert locked, "a lapsed workspace saw every candidate in full"
    assert len(visible) <= server.FREE_REVEAL * server.FREE_ROLE_LIMIT, (
        "the free preview is globally capped, not per-role — otherwise creating "
        "roles is a way to walk the pool"
    )
    for c in locked:
        for f in IDENTITY_FIELDS:
            assert not c.get(f), f"locked candidate leaks {f}"
        assert c["name"].startswith("Candidate #"), "a locked candidate leaked their name"
        assert c["current_company"] == "Hidden until unlock"


def test_locked_candidate_stays_locked_on_direct_fetch(seeded):
    lapse()
    locked = [c for c in candidates(seeded) if c.get("locked")]
    assert locked, "nothing was locked — the fixture cannot prove anything"

    r = seeded.get(f"/api/candidates/{locked[0]['id']}")
    assert r.status_code == 200
    c = r.json()
    assert c.get("locked") is True
    for f in IDENTITY_FIELDS:
        assert not c.get(f), f"direct fetch leaks {f}"


def test_writes_do_not_leak_a_locked_identity(seeded):
    """The regression this file exists for.

    PATCH, stage change and role assignment all return the candidate they just
    wrote. Returned raw, they let anyone read a paywalled name, email and phone
    by rating the candidate one star — cheaper than paying, and it needs no
    exploit, just the ordinary buttons.
    """
    lapse()
    locked = [c for c in candidates(seeded) if c.get("locked")]
    assert locked
    cid = locked[0]["id"]
    job = seeded.get("/api/jobs").json()[0]

    responses = {
        "PATCH /candidates/{id}": seeded.patch(f"/api/candidates/{cid}", json={"rating": 1}),
        "POST /candidates/{id}/stage": seeded.post(f"/api/candidates/{cid}/stage", json={"stage": "Interview"}),
        "POST /candidates/{id}/assign-roles": seeded.post(
            f"/api/candidates/{cid}/assign-roles", json={"role_ids": [job["id"]]}
        ),
    }
    for label, r in responses.items():
        assert r.status_code == 200, f"{label} failed: {r.text}"
        body = r.json()
        assert body.get("locked") is True, f"{label} returned an unredacted candidate"
        for f in IDENTITY_FIELDS:
            assert not body.get(f), f"{label} leaks {f} for a paywalled candidate"


def test_export_is_the_paid_artifact(seeded):
    job = seeded.get("/api/jobs").json()[0]
    assert seeded.get(f"/api/jobs/{job['id']}/export").status_code == 200, (
        "export must work while the plan is active"
    )
    lapse()
    r = seeded.get(f"/api/jobs/{job['id']}/export")
    assert r.status_code == 402, "CSV export is the paid artifact — it must refuse once lapsed"


# ---------- The anti-harvesting defence ----------
def test_preview_slots_are_persisted_never_recomputed(seeded):
    """Every input to a live top-N is client-controlled: role_ids,
    scoring_weights and skills are all patchable, and roles can be deleted and
    recreated. If the preview were recomputed, rotating any of them would walk
    the whole pool three names at a time.
    """
    lapse()
    first = {c["id"] for c in candidates(seeded) if not c.get("locked")}
    assert first, "no preview was assigned at all"
    stored = read_user().get("preview_candidate_ids") or []
    assert set(stored) == first, "the preview was not persisted"

    # Rotate the ranking decisively: detach exactly the people currently being
    # previewed. A recomputed top-N would promote their replacements into the
    # free slots — which is the harvesting loop, one rotation at a time.
    job = seeded.get("/api/jobs").json()[0]
    for cid in list(first):
        seeded.post(f"/api/candidates/{cid}/assign-roles", json={"role_ids": []})
    seeded.patch(f"/api/jobs/{job['id']}", json={
        "scoring_weights": {"skills": 0, "experience": 100, "education": 0, "notice": 0, "culture": 0},
    })

    after = {c["id"] for c in candidates(seeded) if not c.get("locked")}
    assert after == first, "rotating the ranking inputs revealed a different set of names"
    assert (read_user().get("preview_candidate_ids") or []) == stored, (
        "the persisted preview was rewritten — it must be assigned once and frozen"
    )


def test_deleting_and_recreating_roles_does_not_extend_the_preview(seeded):
    lapse()
    first = {c["id"] for c in candidates(seeded) if not c.get("locked")}
    for job in seeded.get("/api/jobs").json():
        seeded.delete(f"/api/jobs/{job['id']}")
    make_job(seeded)

    after = {c["id"] for c in candidates(seeded) if not c.get("locked")}
    assert after <= first, "recreating roles handed out fresh free names"


def test_free_workspaces_are_capped_on_role_creation(client):
    lapse()
    for _ in range(server.FREE_ROLE_LIMIT):
        r = client.post("/api/jobs", json={
            "title": "Role", "department": "Eng", "location": "Bengaluru", "jd": "React",
        })
        assert r.status_code == 200, r.text
    r = client.post("/api/jobs", json={
        "title": "One too many", "department": "Eng", "location": "Bengaluru", "jd": "React",
    })
    assert r.status_code == 402, "unlimited free role creation is the harvesting mechanism"


def test_what_you_saw_while_paying_stays_visible(seeded):
    """The UI promises this in so many words: "Anyone you unlock stays visible
    to you permanently, even if you stop paying later." """
    seen = {c["id"] for c in candidates(seeded)}
    assert seen, "fixture produced no candidates"
    lapse()
    still = {c["id"] for c in candidates(seeded) if not c.get("locked")}
    assert still == seen, "a lapsed workspace lost names it had already been shown"


# ---------- Granting access ----------
def test_grant_access_extends_from_the_later_of_now_or_existing(client):
    """Buying early must never burn the remainder of what you hold."""
    before = read_user()["access_until"]
    _run(server.grant_access(read_user()["id"], 30))
    after = read_user()["access_until"]
    assert after > before, "30 bought days did not extend the window"

    parsed_before = datetime.fromisoformat(before.replace("Z", "+00:00"))
    parsed_after = datetime.fromisoformat(after.replace("Z", "+00:00"))
    assert (parsed_after - parsed_before).days == 30


def test_banked_access_is_capped(client):
    uid = read_user()["id"]
    for _ in range(30):
        _run(server.grant_access(uid, 365))
    until = datetime.fromisoformat(read_user()["access_until"].replace("Z", "+00:00"))
    horizon = datetime.now(timezone.utc) + timedelta(days=server.MAX_BANKED_DAYS + 1)
    assert until < horizon, "a workspace banked years of access at the launch price"


# ---------- Redeeming ----------
def test_wrong_code_never_grants_access(client, monkeypatch):
    monkeypatch.setattr(server, "UNLOCK_CODE", "the-real-code")
    lapse()
    r = client.post("/api/billing/redeem", json={"code": "definitely-not-the-code"})
    assert r.status_code == 403, f"a wrong code returned {r.status_code}"
    assert server._has_access(read_user()) is False


def test_redeem_is_single_use_per_workspace(client, monkeypatch):
    """The code grants DAYS now, and it is a shared string anyone can forward.
    An unguarded loop would be worth MAX_BANKED_DAYS for one payment."""
    monkeypatch.setattr(server, "UNLOCK_CODE", "the-real-code")
    lapse()
    first = client.post("/api/billing/redeem", json={"code": "the-real-code"})
    assert first.status_code == 200, first.text
    assert server._has_access(read_user()) is True

    replay = client.post("/api/billing/redeem", json={"code": "the-real-code"})
    assert replay.status_code == 409, "the same code was redeemed twice"


def test_redeem_is_unavailable_when_no_code_is_configured(client, monkeypatch):
    monkeypatch.setattr(server, "UNLOCK_CODE", "")
    r = client.post("/api/billing/redeem", json={"code": "anything"})
    assert r.status_code == 503
