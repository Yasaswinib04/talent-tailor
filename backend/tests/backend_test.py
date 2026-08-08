"""Backend API tests for CRED HR app."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
ACCESS_CODE = os.environ.get("HR_ACCESS_CODE", "")


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "X-Access-Code": ACCESS_CODE})
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


# ---------------------------------------------------------------------------
# Regression tests — each one covers a bug found during UAT.
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def anon():
    """A client with no access code — i.e. anyone on the internet."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Candidate PII must not be world-readable ---
@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/api/candidates"),
        ("get", "/api/jobs"),
        ("get", "/api/analytics/summary"),
        ("post", "/api/extract-skills"),
        ("post", "/api/candidates/preview-filter"),
    ],
)
def test_recruiter_endpoints_reject_anonymous(anon, method, path):
    r = getattr(anon, method)(f"{BASE_URL}{path}", json={})
    assert r.status_code == 401, f"{path} leaked to an anonymous caller"
    assert "@" not in r.text, "error body must not echo candidate data"


def test_recruiter_endpoints_reject_wrong_code(anon):
    r = anon.get(f"{BASE_URL}/api/candidates", headers={"X-Access-Code": "not-the-code"})
    assert r.status_code == 401


def test_candidate_facing_endpoints_stay_public(anon, jobs):
    """Applicants must never need a code."""
    slug = jobs[0]["share_slug"]
    assert anon.get(f"{BASE_URL}/api/health").status_code == 200
    assert anon.get(f"{BASE_URL}/api/jobs/share/{slug}").status_code == 200


# --- Creating a job with only the required fields used to 500 ---
def test_create_job_without_optional_dicts(client):
    r = client.post(
        f"{BASE_URL}/api/jobs",
        json={"title": "TEST_Minimal Role", "department": "Engineering", "location": "Bengaluru"},
    )
    assert r.status_code == 200, r.text
    job = r.json()
    assert job["filters"] == {} and job["scoring_weights"] == {}
    client.delete(f"{BASE_URL}/api/jobs/{job['id']}")


def test_create_job_with_explicit_nulls(client):
    r = client.post(
        f"{BASE_URL}/api/jobs",
        json={
            "title": "TEST_Null Role", "department": "Product", "location": "Remote",
            "filters": None, "scoring_weights": None,
        },
    )
    assert r.status_code == 200, r.text
    client.delete(f"{BASE_URL}/api/jobs/{r.json()['id']}")


# --- The public apply endpoint is unauthenticated, so it must validate ---
@pytest.mark.parametrize(
    "bad",
    [
        {"name": ""},                      # blank name
        {"email": "not-an-email"},         # malformed email
        {"experience_years": -5},          # negative experience
        {"expected_ctc": -100},            # negative CTC
        {"current_title": ""},             # blank title
    ],
)
def test_apply_rejects_junk(client, jobs, bad):
    slug = jobs[0]["share_slug"]
    payload = {
        "name": "TEST_Validation", "email": "TEST_validation@example.com",
        "phone": "+91 9000000001", "current_title": "Engineer",
        "current_company": "TestCo", "experience_years": 3, "expected_ctc": 1500000,
    }
    payload.update(bad)
    r = client.post(f"{BASE_URL}/api/apply/{slug}", json=payload)
    assert r.status_code == 422, f"accepted {bad}"


def test_apply_twice_updates_instead_of_duplicating(client, jobs):
    slug = jobs[0]["share_slug"]
    payload = {
        "name": "TEST_Dedupe", "email": "TEST_dedupe@example.com",
        "phone": "+91 9000000002", "current_title": "Engineer",
        "current_company": "TestCo", "experience_years": 4, "expected_ctc": 2000000,
    }
    first = client.post(f"{BASE_URL}/api/apply/{slug}", json=payload).json()
    second = client.post(f"{BASE_URL}/api/apply/{slug}", json=payload).json()
    assert second["candidate_id"] == first["candidate_id"]
    assert second["updated"] is True
    matches = [
        c for c in client.get(f"{BASE_URL}/api/candidates").json()
        if c["email"] == "test_dedupe@example.com"
    ]
    assert len(matches) == 1, "duplicate profiles in the recruiter's pool"


def test_apply_does_not_store_placeholder_education(client, jobs):
    """'—' placeholders silently failed the education filter, hiding applicants."""
    slug = jobs[0]["share_slug"]
    r = client.post(
        f"{BASE_URL}/api/apply/{slug}",
        json={
            "name": "TEST_NoPlaceholder", "email": "TEST_noplaceholder@example.com",
            "phone": "+91 9000000003", "current_title": "Engineer",
            "current_company": "TestCo", "experience_years": 5, "expected_ctc": 3000000,
        },
    )
    c = client.get(f"{BASE_URL}/api/candidates/{r.json()['candidate_id']}").json()
    assert "—" not in (c["education"], c["location"], c["notice_period"])
    # and an unknown education must not exclude them from an education filter
    preview = client.post(
        f"{BASE_URL}/api/candidates/preview-filter",
        json={"filters": {"education_preference": "Bachelor's degree or equivalent"}, "skills": []},
    ).json()
    assert preview["passing"] > 0


# --- A bad stage used to make a candidate vanish from every board column ---
def test_invalid_stage_rejected(client, candidates):
    cid = candidates[0]["id"]
    r = client.post(f"{BASE_URL}/api/candidates/{cid}/stage", json={"stage": "Bogus"})
    assert r.status_code == 422


def test_funnel_totals_stay_consistent(client):
    summary = client.get(f"{BASE_URL}/api/analytics/summary").json()
    assert sum(summary["funnel"].values()) == summary["total_candidates"]


# --- PATCH was a raw $set: any field, any type, including id ---
def test_patch_rejects_unknown_and_immutable_fields(client, candidates):
    cid = candidates[0]["id"]
    for payload in ({"id": "hijacked"}, {"match_score": 1}, {"email": "x@y.z"}):
        r = client.patch(f"{BASE_URL}/api/candidates/{cid}", json=payload)
        assert r.status_code == 422, f"accepted {payload}"
    assert client.get(f"{BASE_URL}/api/candidates/{cid}").json()["id"] == cid


def test_patch_rejects_bad_types(client, candidates):
    cid = candidates[0]["id"]
    r = client.patch(f"{BASE_URL}/api/candidates/{cid}", json={"rating": 99})
    assert r.status_code == 422


def test_patch_allows_editable_fields(client, candidates):
    cid = candidates[0]["id"]
    r = client.patch(f"{BASE_URL}/api/candidates/{cid}", json={"notes": "TEST note", "rating": 4})
    assert r.status_code == 200
    assert r.json()["notes"] == "TEST note" and r.json()["rating"] == 4


# --- Roles must exist ---
def test_assign_nonexistent_role_rejected(client, candidates):
    cid = candidates[0]["id"]
    r = client.post(f"{BASE_URL}/api/candidates/{cid}/assign-roles", json={"role_ids": ["nope"]})
    assert r.status_code == 400


# --- Deleting a job used to orphan its candidates ---
def test_deleting_job_unassigns_candidates(client):
    job = client.post(
        f"{BASE_URL}/api/jobs",
        json={"title": "TEST_Doomed Role", "department": "Ops", "location": "Remote"},
    ).json()
    slug = job["share_slug"]
    applicant = client.post(
        f"{BASE_URL}/api/apply/{slug}",
        json={
            "name": "TEST_Orphan", "email": "TEST_orphan@example.com",
            "phone": "+91 9000000004", "current_title": "Analyst",
            "current_company": "TestCo", "experience_years": 2, "expected_ctc": 900000,
        },
    ).json()
    cid = applicant["candidate_id"]
    assert job["id"] in client.get(f"{BASE_URL}/api/candidates/{cid}").json()["role_ids"]

    assert client.delete(f"{BASE_URL}/api/jobs/{job['id']}").status_code == 200
    assert job["id"] not in client.get(f"{BASE_URL}/api/candidates/{cid}").json()["role_ids"]


def test_delete_missing_job_is_404(client):
    assert client.delete(f"{BASE_URL}/api/jobs/does-not-exist").status_code == 404


# --- The recommended filters must not wipe out the whole pool ---
def test_recommended_filters_leave_candidates(client):
    ex = client.post(
        f"{BASE_URL}/api/extract-skills",
        json={"jd": "Senior Frontend Engineer with React, TypeScript, Next.js and performance work."},
    ).json()
    assert ex["recommended_filters"]["must_have_skills"] == [], "strict AND filter applied by default"
    assert ex["suggested_must_have_skills"], "suggestions should still be offered"
    preview = client.post(
        f"{BASE_URL}/api/candidates/preview-filter",
        json={"filters": ex["recommended_filters"], "skills": ex["skills"]},
    ).json()
    assert preview["passing"] > 0, "recommended defaults show an empty pool"
