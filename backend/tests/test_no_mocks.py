"""Everything that was previously mocked, decorative or fabricated.

Each test here pins down a thing the UI claimed to do but didn't.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ["ADMIN_EMAIL"] = "maya@cred.club"
os.environ["ADMIN_PASSWORD"] = "correct horse battery staple"

from mongomock_motor import AsyncMongoMockClient  # noqa: E402
import motor.motor_asyncio as motor_asyncio  # noqa: E402

motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

CREDS = {"email": "maya@cred.club", "password": "correct horse battery staple"}


def _client(seed: bool):
    server.SEED_DEMO_DATA = seed
    server.client = AsyncMongoMockClient()
    server.db = server.client["test"]
    server._login_attempts.clear()
    server._upload_history.clear()
    server._parse_history.clear()
    c = TestClient(server.app, raise_server_exceptions=False)
    c.__enter__()
    assert c.post("/api/auth/login", json=CREDS).status_code == 200
    return c


@pytest.fixture(autouse=True)
def _restore_seed_flag():
    """SEED_DEMO_DATA is a module global. Leaving it flipped leaked into every
    later test module and broke suites that rely on the demo pool."""
    original = server.SEED_DEMO_DATA
    yield
    server.SEED_DEMO_DATA = original


@pytest.fixture()
def client():
    c = _client(seed=True)
    yield c
    c.__exit__(None, None, None)


@pytest.fixture()
def empty_client():
    c = _client(seed=False)
    yield c
    c.__exit__(None, None, None)


# ---------- Demo data must not reach a production database ----------
def test_no_demo_candidates_without_the_flag(empty_client):
    assert empty_client.get("/api/candidates").json()["total"] == 0
    assert empty_client.get("/api/jobs").json() == []


def test_demo_data_still_available_when_asked_for(client):
    assert client.get("/api/candidates").json()["total"] == 20
    assert len(client.get("/api/jobs").json()) == 4


# ---------- The five scoring sliders must actually drive the score ----------
def _job_with(client, weights, filters=None):
    return client.post("/api/jobs", json={
        "title": "Scoring probe", "department": "Engineering", "location": "Bengaluru",
        "skills": [{"name": "React", "weight": 5}, {"name": "Kafka", "weight": 5}],
        "scoring_weights": weights, "filters": filters or {"min_experience_years": 5},
    }).json()


CANDIDATE = {"skills": ["React"], "experience_years": 10, "education": "B.Tech, IIT Bombay",
             "notice_period": "90 days", "current_company": "Razorpay"}


def test_weights_change_the_score(empty_client):
    skills_heavy = _job_with(empty_client, {"skills": 100, "experience": 0, "education": 0,
                                            "notice": 0, "cultural_fit": 0})
    exp_heavy = _job_with(empty_client, {"skills": 0, "experience": 100, "education": 0,
                                         "notice": 0, "cultural_fit": 0})
    a = server.score_candidate(CANDIDATE, skills_heavy)["score"]
    b = server.score_candidate(CANDIDATE, exp_heavy)["score"]
    assert a != b, "the scoring sliders do nothing — the score ignores them"
    assert b == 100, "candidate exceeds the experience bar, so an experience-only score is 100"
    assert a == 50, "they have one of two equally weighted skills"


def test_score_exposes_its_breakdown(empty_client):
    job = _job_with(empty_client, server.DEFAULT_WEIGHTS)
    out = server.score_candidate(CANDIDATE, job)
    assert set(out["components"]) == {"skills", "experience", "education", "notice", "cultural_fit"}
    assert 0 <= out["score"] <= 100


def test_unknown_fields_score_neutral_not_zero(empty_client):
    job = _job_with(empty_client, server.DEFAULT_WEIGHTS,
                    filters={"min_experience_years": 5,
                             "education_preference": "Master's or higher",
                             "notice_period_max_days": 30})
    blank = {"skills": ["React"], "experience_years": 10, "education": "",
             "notice_period": "", "current_company": ""}
    out = server.score_candidate(blank, job)
    assert out["components"]["education"] == server.UNKNOWN_COMPONENT_SCORE
    assert out["components"]["notice"] == server.UNKNOWN_COMPONENT_SCORE


def test_all_weights_zero_does_not_flatten_everyone_to_zero(empty_client):
    job = _job_with(empty_client, {"skills": 0, "experience": 0, "education": 0,
                                   "notice": 0, "cultural_fit": 0})
    assert server.score_candidate(CANDIDATE, job)["score"] > 0


def test_editing_a_roles_weights_rescores_its_candidates(client):
    job = client.get("/api/jobs").json()[0]
    before = [c["match_score"] for c in
              client.get(f"/api/candidates?job_id={job['id']}").json()["items"]]
    r = client.patch(f"/api/jobs/{job['id']}", json={
        "scoring_weights": {"skills": 0, "experience": 100, "education": 0,
                            "notice": 0, "cultural_fit": 0}})
    assert r.status_code == 200
    after = [c["match_score"] for c in
             client.get(f"/api/candidates?job_id={job['id']}").json()["items"]]
    assert before != after, "changing the weights left every score untouched"


def test_score_breakdown_endpoint(client):
    job = client.get("/api/jobs").json()[0]
    cid = client.get(f"/api/candidates?job_id={job['id']}").json()["items"][0]["id"]
    r = client.get(f"/api/candidates/{cid}/score?job_id={job['id']}")
    assert r.status_code == 200
    assert "components" in r.json() and "weights" in r.json()


# ---------- Analytics must be computed, not hardcoded ----------
def test_analytics_are_not_the_old_hardcoded_constants(empty_client):
    d = empty_client.get("/api/analytics/summary").json()
    # Previously always 2.4 and 0.68 regardless of the data.
    assert d["avg_time_to_shortlist_days"] is None, "no history yet, so it must not invent a number"
    assert d["self_applied_share"] is None


def test_time_to_shortlist_is_measured_from_real_events(client):
    job = client.get("/api/jobs").json()[0]
    cand = next(c for c in client.get(f"/api/candidates?job_id={job['id']}").json()["items"]
                if c["stage"] != "Shortlisted")
    cid = cand["id"]
    client.post(f"/api/candidates/{cid}/stage", json={"stage": "Shortlisted"})
    d = client.get("/api/analytics/summary").json()
    assert d["avg_time_to_shortlist_days"] is not None
    assert d["avg_time_to_shortlist_sample"] >= 1


def test_self_applied_share_reflects_actual_sources(client):
    job = client.get("/api/jobs").json()[0]
    client.post(f"/api/apply/{job['share_slug']}", json={
        "name": "Ritu Malhotra", "email": "ritu@cv.in", "phone": "+91 90000 00000",
        "current_title": "Engineer", "current_company": "Ola",
        "experience_years": 6, "expected_ctc": 3000000, "resume_text": "Golang Kafka"})
    d = client.get("/api/analytics/summary").json()
    assert d["self_applied_count"] == 1
    assert d["self_applied_share"] == round(1 / d["total_candidates"], 2)


# ---------- The activity feed must be real history ----------
def test_activity_is_recorded_not_fabricated(client):
    job = client.get("/api/jobs").json()[0]
    cid = next(c for c in client.get(f"/api/candidates?job_id={job['id']}").json()["items"]
               if c["stage"] != "Interview")["id"]
    assert client.get(f"/api/candidates/{cid}/events").json() == []

    client.post(f"/api/candidates/{cid}/stage", json={"stage": "Interview"})
    client.patch(f"/api/candidates/{cid}", json={"rating": 4})
    events = client.get(f"/api/candidates/{cid}/events").json()
    kinds = {e["kind"] for e in events}
    assert {"stage_changed", "rated"} <= kinds
    stage_ev = next(e for e in events if e["kind"] == "stage_changed")
    assert stage_ev["to_stage"] == "Interview"
    assert stage_ev["actor"] == "maya", "an audit trail has to say who did it"
    assert stage_ev["at"], "and when"


def test_no_event_is_recorded_for_a_no_op_stage_change(client):
    job = client.get("/api/jobs").json()[0]
    c = client.get(f"/api/candidates?job_id={job['id']}").json()["items"][0]
    client.post(f"/api/candidates/{c['id']}/stage", json={"stage": c["stage"]})
    assert client.get(f"/api/candidates/{c['id']}/events").json() == []


# ---------- Onboarding must persist ----------
def test_onboarding_persists_and_creates_the_first_role(empty_client):
    r = empty_client.post("/api/onboarding", json={
        "company_name": "CRED", "company_size": "500-1000", "industry": "Fintech",
        "role_title": "Senior Frontend Engineer", "role_department": "Engineering",
        "role_location": "Bengaluru", "invite_emails": ["kunal@cred.club"]})
    assert r.status_code == 200
    assert r.json()["job"]["title"] == "Senior Frontend Engineer"

    saved = empty_client.get("/api/onboarding").json()
    assert saved["company_name"] == "CRED" and saved["completed"] is True
    assert saved["invite_emails"] == ["kunal@cred.club"]
    assert any(j["title"] == "Senior Frontend Engineer" for j in empty_client.get("/api/jobs").json())


def test_onboarding_rejects_a_blank_company_and_bad_invites(empty_client):
    assert empty_client.post("/api/onboarding", json={"company_name": ""}).status_code == 422
    assert empty_client.post("/api/onboarding", json={
        "company_name": "CRED", "invite_emails": ["not-an-email"]}).status_code == 422


def test_onboarding_twice_does_not_duplicate_the_role(empty_client):
    body = {"company_name": "CRED", "role_title": "Backend Engineer"}
    empty_client.post("/api/onboarding", json=body)
    empty_client.post("/api/onboarding", json=body)
    titles = [j["title"] for j in empty_client.get("/api/jobs").json()]
    assert titles.count("Backend Engineer") == 1


# ---------- Pagination, so nobody is silently dropped ----------
def test_candidates_are_paginated_with_a_total(client):
    r = client.get("/api/candidates?limit=5").json()
    assert len(r["items"]) == 5
    assert r["total"] == 20 and r["has_more"] is True
    page2 = client.get("/api/candidates?limit=5&offset=5").json()
    assert {c["id"] for c in page2["items"]}.isdisjoint({c["id"] for c in r["items"]})


def test_search_spans_the_whole_collection_not_just_one_page(client):
    r = client.get("/api/candidates?q=razorpay&limit=2").json()
    assert r["total"] >= 1
    assert all("razorpay" in c["current_company"].lower() for c in r["items"])


def test_unassigned_filter(client):
    job = client.get("/api/jobs").json()[0]
    client.delete(f"/api/jobs/{job['id']}")
    r = client.get("/api/candidates?unassigned=true").json()
    assert r["total"] >= 1
    assert all(c["role_ids"] == [] for c in r["items"])


# ---------- Job validation that was missing ----------
@pytest.mark.parametrize("bad,label", [
    ({"title": ""}, "blank title"),
    ({"title": "   "}, "whitespace title"),
    ({"salary_min": 9000000, "salary_max": 100000}, "inverted salary"),
    ({"salary_min": -500}, "negative salary"),
])
def test_bad_job_payloads_are_rejected(empty_client, bad, label):
    r = empty_client.post("/api/jobs", json={
        "title": "Valid", "department": "Engineering", "location": "Bengaluru", **bad})
    assert r.status_code == 422, f"{label} was accepted"


def test_share_slug_is_long_enough_to_not_be_guessed(empty_client):
    job = empty_client.post("/api/jobs", json={
        "title": "Slug probe", "department": "E", "location": "B"}).json()
    assert len(job["share_slug"]) >= 12
