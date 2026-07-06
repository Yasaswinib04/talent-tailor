"""Backend API tests for CRED HR app."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://29cfe93b-a616-42ca-891a-3c423a1bbdf7.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


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


# ---------- Jobs ----------
def test_jobs_seeded(jobs):
    assert len(jobs) >= 4
    titles = {j["title"] for j in jobs}
    expected = {"Senior Frontend Engineer", "Product Manager - Payments", "Backend Engineer - Platform", "UX Researcher"}
    assert expected.issubset(titles), f"Missing seeded jobs. Got: {titles}"
    for j in jobs:
        assert "id" in j and "share_slug" in j
        assert len(j["share_slug"]) == 8


def test_get_job_by_id(client, jobs):
    j = jobs[0]
    r = client.get(f"{BASE_URL}/api/jobs/{j['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == j["id"]


def test_get_job_by_share_slug(client, jobs):
    j = jobs[0]
    r = client.get(f"{BASE_URL}/api/jobs/share/{j['share_slug']}")
    assert r.status_code == 200
    assert r.json()["id"] == j["id"]


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


# ---------- Extract Skills ----------
def test_extract_skills(client):
    r = client.post(f"{BASE_URL}/api/extract-skills", json={
        "jd": "We need senior engineer with react typescript design systems experience"
    })
    assert r.status_code == 200
    d = r.json()
    assert "skills" in d and "salary_suggestion" in d and "screening_questions" in d
    names = {s["name"] for s in d["skills"]}
    assert "React" in names
    assert "TypeScript" in names
    assert "Design Systems" in names
    # senior => higher salary
    assert d["salary_suggestion"]["min"] >= 3000000
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


# ---------- Public Apply ----------
def test_public_apply(client, jobs):
    # find frontend Engineer job
    fe_job = next((j for j in jobs if "Frontend" in j["title"]), jobs[0])
    slug = fe_job["share_slug"]
    r = client.get(f"{BASE_URL}/api/jobs/share/{slug}")
    assert r.status_code == 200
    payload = {
        "name": "TEST_Auto Applicant",
        "email": "TEST_auto@example.com",
        "phone": "+91 9000000000",
        "current_title": "Senior React Developer",
        "current_company": "TestCo",
        "experience_years": 6,
        "expected_ctc": 4000000,
        "resume_text": "Expert in React, TypeScript, Next.js, Design Systems and Performance Optimization",
    }
    r2 = client.post(f"{BASE_URL}/api/apply/{slug}", json=payload)
    assert r2.status_code == 200
    d = r2.json()
    assert d["ok"] is True
    assert "candidate_id" in d
    assert "match_score" in d and 0 <= d["match_score"] <= 100
    # verify candidate created with auto_applied=true
    r3 = client.get(f"{BASE_URL}/api/candidates/{d['candidate_id']}")
    assert r3.status_code == 200
    c = r3.json()
    assert c["auto_applied"] is True
    assert fe_job["id"] in c["role_ids"]


# ---------- Analytics ----------
def test_analytics_summary(client):
    r = client.get(f"{BASE_URL}/api/analytics/summary")
    assert r.status_code == 200
    d = r.json()
    for k in ["total_jobs", "total_candidates", "funnel", "auto_apply_conversion"]:
        assert k in d
    for stage in ["New", "Shortlisted", "Interview", "Offer", "Rejected"]:
        assert stage in d["funnel"]
