"""Backend API tests for Talent Tailor.

Everything recruiter-facing now lives behind an account, so these tests sign in
first and run inside their own workspace. Two consequences worth knowing before
you edit this file:

- **The suite needs credentials.** Set TT_TEST_EMAIL and TT_TEST_PASSWORD. The
  account is created on first run and reused forever after, so pointing CI at
  production doesn't drip a new user into the database on every push.
- **It writes.** Jobs, candidates and stage changes all land in that one test
  workspace, isolated from any real customer's data by owner_id. There is no
  longer a reason to exclude the write tests from a production run.

Run against a local server:

    REACT_APP_BACKEND_URL=http://127.0.0.1:8000 pytest backend/tests/backend_test.py -q
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
IS_LOCAL = any(h in BASE_URL for h in ("127.0.0.1", "localhost"))


def _credentials(suffix: str = ""):
    """Test-account credentials. Explicit env vars against a remote host, so a
    CI run reuses one account instead of creating one per push; a throwaway
    account locally, so a fresh clone needs no setup."""
    email = os.environ.get("TT_TEST_EMAIL")
    password = os.environ.get("TT_TEST_PASSWORD")
    if not (email and password):
        if not IS_LOCAL:
            raise RuntimeError(
                f"Refusing to run against {BASE_URL} without TT_TEST_EMAIL and "
                "TT_TEST_PASSWORD — otherwise every run creates a new account in "
                "that database. Set both and re-run."
            )
        email, password = f"qa-{uuid.uuid4().hex[:10]}@talent-tailor.test", "test-password-123"
    if suffix:
        local, _, domain = email.partition("@")
        email = f"{local}+{suffix}@{domain}"
    return email, password


def _sign_in(email: str, password: str) -> requests.Session:
    """Log in, or sign up the first time. Returns a session that carries the
    bearer token on every subsequent request."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if r.status_code == 401:
        r = s.post(
            f"{BASE_URL}/api/auth/signup",
            json={"name": "QA Bot", "email": email, "password": password, "company": "Talent Tailor QA"},
        )
    assert r.status_code == 200, f"could not sign in as {email}: {r.status_code} {r.text}"
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


def _server_is_up() -> bool:
    try:
        return requests.get(f"{BASE_URL}/api/health", timeout=2).status_code == 200
    except requests.RequestException:
        return False


# This module drives a *running* instance over HTTP, unlike the rest of the
# suite. Skip rather than error when there isn't one, so `pytest backend/tests`
# is green on a clean checkout and a real failure here still means something.
pytestmark = pytest.mark.skipif(
    not _server_is_up(),
    reason=f"no API at {BASE_URL} — start the backend to run these",
)


@pytest.fixture(scope="session")
def client():
    """Signed-in session with the sample dataset loaded."""
    s = _sign_in(*_credentials())
    # 409 = a previous run already loaded it. Both outcomes leave the workspace
    # in the state the tests expect.
    r = s.post(f"{BASE_URL}/api/sample-data")
    assert r.status_code in (200, 409), f"sample data failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def anon():
    """Unauthenticated session, for checking that the doors are locked."""
    return requests.Session()


@pytest.fixture(scope="session")
def other_workspace():
    """A second account, to prove one workspace cannot read another's."""
    return _sign_in(*_credentials(suffix="isolation"))


@pytest.fixture(scope="session")
def jobs(client):
    r = client.get(f"{BASE_URL}/api/jobs")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def candidates(client):
    r = client.get(f"{BASE_URL}/api/candidates")
    assert r.status_code == 200
    return r.json()




# ---------- Health ----------
def test_health(client):
    r = client.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "ok"
    assert "time" in d


# ---------- Auth ----------
def test_recruiter_routes_require_a_session(anon):
    for path in ("/api/jobs", "/api/candidates", "/api/analytics/summary", "/api/billing/config"):
        r = anon.get(f"{BASE_URL}{path}")
        assert r.status_code == 401, f"{path} answered {r.status_code} to a stranger"


def test_bad_token_is_rejected(anon):
    r = anon.get(f"{BASE_URL}/api/jobs", headers={"Authorization": "Bearer not.a.real.token"})
    assert r.status_code == 401


def test_me_returns_the_signed_in_account(client):
    r = client.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    d = r.json()
    assert "@" in d["email"]
    assert "password" not in d and "password_hash" not in d


def test_workspaces_are_isolated(other_workspace, jobs, candidates):
    """The whole tenancy promise in one test: another account gets a 404, not
    a peek, for a role and a candidate it doesn't own."""
    r = other_workspace.get(f"{BASE_URL}/api/jobs/{jobs[0]['id']}")
    assert r.status_code == 404
    r = other_workspace.get(f"{BASE_URL}/api/candidates/{candidates[0]['id']}")
    assert r.status_code == 404


# ---------- Jobs ----------
def test_sample_data_loaded(jobs):
    assert len(jobs) >= 4
    titles = {j["title"] for j in jobs}
    expected = {"Senior Frontend Engineer", "Product Manager - Payments", "Backend Engineer - Platform", "UX Researcher"}
    assert expected.issubset(titles), f"Missing sample roles. Got: {titles}"
    for j in jobs:
        assert "id" in j and "share_slug" in j
        assert len(j["share_slug"]) == 8


def test_get_job_by_id(client, jobs):
    j = jobs[0]
    r = client.get(f"{BASE_URL}/api/jobs/{j['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == j["id"]


def test_get_job_by_share_slug(anon, jobs):
    """Public by design — an applicant has no account. It must still not leak
    the recruiter's rubric or workspace."""
    j = jobs[0]
    r = anon.get(f"{BASE_URL}/api/jobs/share/{j['share_slug']}")
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == j["id"]
    for leaked in ("owner_id", "filters", "scoring_weights", "unlocked"):
        assert leaked not in d, f"share page exposes {leaked}"


def test_create_job(client):
    payload = {
        "title": "TEST_QA Automation Engineer",
        "department": "Engineering",
        "location": "Bengaluru",
        "jd": "Test JD",
        "skills": [{"name": "Playwright", "weight": 5}],
    }
    r = client.post(f"{BASE_URL}/api/jobs", json=payload)
    assert r.status_code == 200
    created = r.json()
    assert created["title"] == payload["title"]
    assert "share_slug" in created
    # verify it's in the list
    r2 = client.get(f"{BASE_URL}/api/jobs")
    ids = [j["id"] for j in r2.json()]
    assert created["id"] in ids
    # cleanup
    client.delete(f"{BASE_URL}/api/jobs/{created['id']}")


def test_server_controlled_job_fields_are_not_patchable(client, jobs):
    """`unlocked` is the paywall's switch. A PATCH body must never reach it."""
    j = jobs[0]
    r = client.patch(f"{BASE_URL}/api/jobs/{j['id']}", json={"unlocked": True, "title": j["title"]})
    assert r.status_code == 200
    assert r.json().get("unlocked") is False, "a client just unlocked a shortlist for free"


# ---------- Candidates ----------
def test_candidates_seeded(candidates):
    assert len(candidates) >= 20
    # sorted by match_score desc
    scores = [c["match_score"] for c in candidates[:20]]
    assert scores == sorted(scores, reverse=True), f"Not sorted desc: {scores}"


def test_candidates_filter_by_stage(client):
    r = client.get(f"{BASE_URL}/api/candidates", params={"stage": "Shortlisted"})
    assert r.status_code == 200
    for c in r.json():
        assert c["stage"] == "Shortlisted"


def test_candidates_filter_by_job(client, jobs):
    j = jobs[0]
    r = client.get(f"{BASE_URL}/api/candidates", params={"job_id": j["id"]})
    assert r.status_code == 200
    for c in r.json():
        assert j["id"] in c["role_ids"]


# ---------- Paywall ----------
# Redaction itself is pinned in tests/test_paywall.py, not here. Observing it
# needs a workspace whose plan has EXPIRED, and every workspace this file can
# create over HTTP has a live 14-day trial — there is deliberately no endpoint
# that revokes access. What a live server can prove is that the entitlement is
# reported, that the paid artifact is gated on it, and that the retired
# per-role unlock path is really gone.
def test_billing_config_reports_the_entitlement(client):
    r = client.get(f"{BASE_URL}/api/billing/config")
    assert r.status_code == 200
    cfg = r.json()
    assert "has_access" in cfg, "the client cannot tell whether this workspace is paid"
    assert isinstance(cfg.get("price_inr"), int), "the frontend must never hardcode a price"
    for secret in ("razorpay_key_secret", "unlock_code"):
        assert secret not in cfg, f"/billing/config leaked {secret}"


def test_there_is_only_one_paywall_path(client, jobs):
    """`07954d1` replaced the per-role unlock with workspace-wide access. Two
    disagreeing entitlement paths is the bug that showed the same person a full
    name on one screen and "Candidate #7" on another — so the old route must be
    gone, not merely unused."""
    if not jobs:
        pytest.skip("no roles in this workspace")
    r = client.post(f"{BASE_URL}/api/jobs/{jobs[0]['id']}/unlock", json={"code": "anything"})
    assert r.status_code == 404, (
        f"the per-role unlock route still answers ({r.status_code}) — that is a second paywall path"
    )


def test_redeeming_a_wrong_code_never_grants_access(client):
    r = client.post(f"{BASE_URL}/api/billing/redeem", json={"code": "definitely-not-the-code"})
    # 403 wrong code, 503 redeeming not configured, 409 this workspace already
    # redeemed the real one. Never 200.
    assert r.status_code in (403, 503, 409), f"a wrong code returned {r.status_code}"


def test_export_tracks_the_entitlement(client, jobs):
    """Export is the paid artifact. It must agree with /billing/config rather
    than making its own decision — a second opinion here is a second paywall."""
    if not jobs:
        pytest.skip("no roles in this workspace")
    has_access = client.get(f"{BASE_URL}/api/billing/config").json().get("has_access")
    r = client.get(f"{BASE_URL}/api/jobs/{jobs[0]['id']}/export")
    if has_access:
        assert r.status_code == 200, "a paid workspace was refused its own export"
    else:
        assert r.status_code == 402, "a lapsed workspace exported the paid artifact"


# ---------- Extract Skills ----------
def test_extract_skills(client):
    r = client.post(f"{BASE_URL}/api/extract-skills", json={
        "jd": "We need senior engineer with react typescript design systems experience"
    })
    assert r.status_code == 200
    d = r.json()
    assert "skills" in d and "salary_suggestion" in d and "screening_questions" in d
    names = {s["name"] for s in d["skills"]}
    # The LLM path returns canonical names too, but phrasing varies by model —
    # assert on the substance both paths agree on.
    assert any("react" in n.lower() for n in names)
    assert any("typescript" in n.lower() for n in names)
    assert d["salary_suggestion"]["min"] >= 3000000  # senior => higher band
    assert len(d["screening_questions"]) >= 1


def test_extract_skills_empty(client):
    r = client.post(f"{BASE_URL}/api/extract-skills", json={"jd": ""})
    assert r.status_code == 200
    d = r.json()
    assert len(d["skills"]) >= 1  # default suggestions


# ---------- Stage update ----------
def test_stage_update(client, candidates):
    cid = candidates[0]["id"]
    original_stage = candidates[0]["stage"]
    r = client.post(f"{BASE_URL}/api/candidates/{cid}/stage", json={"stage": "Interview"})
    assert r.status_code == 200
    assert r.json()["stage"] == "Interview"
    # verify persisted
    r2 = client.get(f"{BASE_URL}/api/candidates/{cid}")
    assert r2.json()["stage"] == "Interview"
    # restore
    client.post(f"{BASE_URL}/api/candidates/{cid}/stage", json={"stage": original_stage})


# ---------- Assign roles (multiple) ----------
def test_assign_multiple_roles(client, candidates, jobs):
    cid = candidates[0]["id"]
    original_roles = candidates[0]["role_ids"]
    role_ids = [jobs[0]["id"], jobs[1]["id"]]
    r = client.post(f"{BASE_URL}/api/candidates/{cid}/assign-roles", json={"role_ids": role_ids})
    assert r.status_code == 200
    assert set(r.json()["role_ids"]) == set(role_ids)
    # verify counts updated on jobs
    r2 = client.get(f"{BASE_URL}/api/jobs/{jobs[1]['id']}")
    assert r2.json()["candidates_count"] >= 1
    # restore
    client.post(f"{BASE_URL}/api/candidates/{cid}/assign-roles", json={"role_ids": original_roles})


def test_cannot_assign_another_workspaces_role(client, other_workspace, candidates):
    """assign-roles filters to owned roles; a foreign id must be dropped, not
    silently attached."""
    r = other_workspace.post(f"{BASE_URL}/api/jobs", json={
        "title": "TEST_Foreign Role", "department": "Eng", "location": "Remote",
    })
    assert r.status_code == 200
    foreign = r.json()
    try:
        cid = candidates[0]["id"]
        original_roles = candidates[0]["role_ids"]
        r = client.post(f"{BASE_URL}/api/candidates/{cid}/assign-roles", json={"role_ids": [foreign["id"]]})
        assert r.status_code == 200
        assert foreign["id"] not in r.json()["role_ids"]
        client.post(f"{BASE_URL}/api/candidates/{cid}/assign-roles", json={"role_ids": original_roles})
    finally:
        other_workspace.delete(f"{BASE_URL}/api/jobs/{foreign['id']}")


# ---------- Public Apply ----------
def test_public_apply(anon, client, jobs):
    """The applicant has no account — this whole flow must work unauthenticated."""
    fe_job = next((j for j in jobs if "Frontend" in j["title"]), jobs[0])
    slug = fe_job["share_slug"]
    r = anon.get(f"{BASE_URL}/api/jobs/share/{slug}")
    assert r.status_code == 200
    payload = {
        "name": "TEST_Auto Applicant",
        "email": f"TEST_auto+{uuid.uuid4().hex[:8]}@example.com",
        "phone": "+91 9000000000",
        "current_title": "Senior React Developer",
        "current_company": "TestCo",
        "experience_years": 6,
        "expected_ctc": 4000000,
        "resume_text": "Expert in React, TypeScript, Next.js, Design Systems and Performance Optimization",
    }
    r2 = anon.post(f"{BASE_URL}/api/apply/{slug}", json=payload)
    assert r2.status_code == 200
    d = r2.json()
    assert d["ok"] is True
    assert "candidate_id" in d
    assert "match_score" in d and 0 <= d["match_score"] <= 100
    # The applicant lands in the role owner's workspace, flagged auto_applied.
    r3 = client.get(f"{BASE_URL}/api/candidates/{d['candidate_id']}")
    assert r3.status_code == 200
    c = r3.json()
    assert c["auto_applied"] is True
    assert fe_job["id"] in c["role_ids"]


def test_apply_rejects_a_malformed_email(anon, jobs):
    slug = jobs[0]["share_slug"]
    r = anon.post(f"{BASE_URL}/api/apply/{slug}", json={
        "name": "TEST_Bad Email", "email": "not-an-email", "phone": "+91 9000000000",
        "current_title": "Engineer", "current_company": "TestCo",
        "experience_years": 3, "expected_ctc": 2000000,
    })
    assert r.status_code == 422


# ---------- Lead list ----------
def test_visitor_list_needs_the_admin_key(anon):
    r = anon.get(f"{BASE_URL}/api/visitors")
    assert r.status_code == 403, "the lead list answered without an admin key"


# ---------- Analytics ----------
def test_analytics_summary(client):
    r = client.get(f"{BASE_URL}/api/analytics/summary")
    assert r.status_code == 200
    d = r.json()
    for k in ["total_jobs", "total_candidates", "funnel", "auto_apply_conversion"]:
        assert k in d
    for stage in ["New", "Shortlisted", "Interview", "Offer", "Rejected"]:
        assert stage in d["funnel"]


def test_analytics_counts_only_this_workspace(client, other_workspace):
    r = other_workspace.get(f"{BASE_URL}/api/analytics/summary")
    assert r.status_code == 200
    assert r.json()["total_candidates"] == 0, "analytics is counting another workspace's people"
