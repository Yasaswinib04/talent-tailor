"""Track B — the data-integrity issues that would corrupt a real pipeline.

    pytest backend/tests/test_pipeline_integrity.py
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ["SEED_DEMO_DATA"] = "true"  # fixtures need the demo pool
os.environ["ADMIN_EMAIL"] = "maya@cred.club"
os.environ["ADMIN_PASSWORD"] = "correct horse battery staple"

from mongomock_motor import AsyncMongoMockClient  # noqa: E402
import motor.motor_asyncio as motor_asyncio  # noqa: E402

motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

GOOD_APPLICATION = {
    "name": "Aarav Menon", "email": "aarav.menon@cv.in", "phone": "+91 98450 22118",
    "current_title": "Senior Frontend Engineer", "current_company": "Razorpay",
    "experience_years": 5.5, "expected_ctc": 4000000,
    "resume_text": "React, TypeScript, Next.js, design systems",
}


@pytest.fixture()
def client():
    server.client = AsyncMongoMockClient()
    server.db = server.client["test"]
    server._login_attempts.clear()
    server._upload_history.clear()
    with TestClient(server.app, raise_server_exceptions=False) as c:
        r = c.post("/api/auth/login", json={"email": "maya@cred.club",
                                            "password": "correct horse battery staple"})
        assert r.status_code == 200
        yield c


@pytest.fixture()
def slug(client):
    return client.get("/api/jobs").json()[0]["share_slug"]


# ---------- P1-1: a real person is filling this in ----------
@pytest.mark.parametrize("bad,label", [
    ({"name": ""}, "empty name"),
    ({"name": "   "}, "whitespace name"),
    ({"name": "12345"}, "name with no letters"),
    ({"email": ""}, "empty email"),
    ({"email": "not-an-email"}, "malformed email"),
    ({"experience_years": -5}, "negative experience"),
    ({"experience_years": 200}, "impossible experience"),
    ({"expected_ctc": -100}, "negative salary"),
])
def test_junk_applications_are_rejected(client, slug, bad, label):
    r = client.post(f"/api/apply/{slug}", json={**GOOD_APPLICATION, **bad})
    assert r.status_code == 422, f"{label} was accepted"
    assert not client.get("/api/candidates").json()["items"] or all(
        c["email"] != GOOD_APPLICATION["email"] for c in client.get("/api/candidates").json()["items"]
    )


def test_a_good_application_is_accepted(client, slug):
    r = client.post(f"/api/apply/{slug}", json=GOOD_APPLICATION)
    assert r.status_code == 200 and r.json()["duplicate"] is False


def test_no_blank_rows_reach_the_dashboard(client, slug):
    client.post(f"/api/apply/{slug}", json={**GOOD_APPLICATION, "name": "", "email": ""})
    for c in client.get("/api/candidates").json()["items"]:
        assert c["name"].strip() and c["email"].strip()


# ---------- P1-2: one person, one record ----------
def test_applying_twice_does_not_create_two_candidates(client, slug):
    first = client.post(f"/api/apply/{slug}", json=GOOD_APPLICATION).json()
    second = client.post(f"/api/apply/{slug}", json=GOOD_APPLICATION).json()
    assert second["duplicate"] is True
    assert second["candidate_id"] == first["candidate_id"]
    matches = [c for c in client.get("/api/candidates").json()["items"]
               if c["email"] == GOOD_APPLICATION["email"]]
    assert len(matches) == 1


def test_reapplying_updates_their_details(client, slug):
    client.post(f"/api/apply/{slug}", json=GOOD_APPLICATION)
    client.post(f"/api/apply/{slug}", json={**GOOD_APPLICATION,
                                            "current_company": "Flipkart", "expected_ctc": 5000000})
    c = next(x for x in client.get("/api/candidates").json()["items"]
             if x["email"] == GOOD_APPLICATION["email"])
    assert c["current_company"] == "Flipkart" and c["expected_ctc"] == 5000000


def test_reapplying_does_not_wipe_recruiter_work(client, slug):
    cid = client.post(f"/api/apply/{slug}", json=GOOD_APPLICATION).json()["candidate_id"]
    client.post(f"/api/candidates/{cid}/stage", json={"stage": "Interview"})
    client.patch(f"/api/candidates/{cid}", json={"rating": 4, "notes": "Strong signal"})
    client.post(f"/api/apply/{slug}", json=GOOD_APPLICATION)
    c = client.get(f"/api/candidates/{cid}").json()
    assert c["stage"] == "Interview" and c["rating"] == 4 and c["notes"] == "Strong signal"


def test_applying_to_a_second_role_attaches_rather_than_duplicates(client):
    jobs = client.get("/api/jobs").json()
    client.post(f"/api/apply/{jobs[0]['share_slug']}", json=GOOD_APPLICATION)
    r = client.post(f"/api/apply/{jobs[1]['share_slug']}", json=GOOD_APPLICATION).json()
    assert r["duplicate"] is True
    c = next(x for x in client.get("/api/candidates").json()["items"]
             if x["email"] == GOOD_APPLICATION["email"])
    assert {jobs[0]["id"], jobs[1]["id"]} <= set(c["role_ids"])


def test_email_case_does_not_create_a_second_record(client, slug):
    client.post(f"/api/apply/{slug}", json=GOOD_APPLICATION)
    client.post(f"/api/apply/{slug}", json={**GOOD_APPLICATION, "email": "Aarav.Menon@CV.in"})
    matches = [c for c in client.get("/api/candidates").json()["items"]
               if c["email"].lower() == GOOD_APPLICATION["email"]]
    assert len(matches) == 1


def test_role_counts_stay_truthful_across_reapplications(client, slug):
    job_id = client.get("/api/jobs").json()[0]["id"]
    for _ in range(3):
        client.post(f"/api/apply/{slug}", json=GOOD_APPLICATION)
    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["candidates_count"] == len(client.get(f"/api/candidates?job_id={job_id}").json()["items"])


# ---------- P1-4: deleting a role must not orphan people ----------
def test_deleting_a_role_detaches_it_from_candidates(client):
    job = client.get("/api/jobs").json()[0]
    before = client.get(f"/api/candidates?job_id={job['id']}").json()["items"]
    assert before, "fixture should have candidates on this role"

    r = client.delete(f"/api/jobs/{job['id']}")
    assert r.status_code == 200
    assert r.json()["detached_candidates"] == len(before)

    stale = [c for c in client.get("/api/candidates").json()["items"] if job["id"] in c["role_ids"]]
    assert not stale, "candidates still reference the deleted role"


def test_candidates_survive_the_deletion_of_their_role(client):
    job = client.get("/api/jobs").json()[0]
    names = {c["name"] for c in client.get(f"/api/candidates?job_id={job['id']}").json()["items"]}
    client.delete(f"/api/jobs/{job['id']}")
    still_there = {c["name"] for c in client.get("/api/candidates").json()["items"]}
    assert names <= still_there, "deleting a role must not delete people"


def test_other_role_counts_are_recomputed_after_a_delete(client):
    jobs = client.get("/api/jobs").json()
    client.delete(f"/api/jobs/{jobs[0]['id']}")
    for j in client.get("/api/jobs").json():
        actual = len(client.get(f"/api/candidates?job_id={j['id']}").json()["items"])
        assert j["candidates_count"] == actual, f"{j['title']} count drifted"


def test_deleting_an_unknown_role_is_404(client):
    assert client.delete("/api/jobs/does-not-exist").status_code == 404


# ---------- P1-5: a recommendation that leaves nobody is useless ----------
SAMPLE_JD = ("We're looking for a Senior Frontend Engineer to lead the UI architecture. "
             "React, TypeScript and Next.js at scale, performance optimization, design "
             "systems. Fintech / UPI / payments background is a plus.")


def test_recommended_filters_leave_a_usable_shortlist(client):
    d = client.post("/api/extract-skills", json={"jd": SAMPLE_JD}).json()
    impact = d["filter_impact"]
    assert impact["passing"] > 0, (
        f"recommended defaults pass {impact['passing']} of {impact['total']} — "
        f"a new recruiter's first screen would say nobody qualifies"
    )
    assert impact["passing"] >= max(3, int(impact["total"] * 0.15))


def test_the_recommendation_is_verified_against_the_real_pool(client):
    d = client.post("/api/extract-skills", json={"jd": SAMPLE_JD}).json()
    preview = client.post("/api/candidates/preview-filter",
                          json={"filters": d["recommended_filters"]}).json()
    assert preview["passing"] == d["filter_impact"]["passing"]


def test_recommendation_works_when_the_pool_is_empty(client):
    import anyio
    anyio.run(lambda: server.db.candidates.delete_many({}))
    d = client.post("/api/extract-skills", json={"jd": SAMPLE_JD}).json()
    assert d["recommended_filters"] is not None
    assert d["filter_impact"]["total"] == 0


# ---------- Unknown data must never auto-reject ----------
def test_unknown_notice_period_is_not_treated_as_immediate():
    assert server._parse_notice_days("") is None
    assert server._parse_notice_days("—") is None
    assert server._parse_notice_days("Immediate") == 0
    assert server._parse_notice_days("30 days") == 30
    assert server._parse_notice_days("2 months") == 60


def test_unknown_education_does_not_fail_the_filter():
    assert server._matches_education("", "Master's or higher") is None
    assert server._matches_education("—", "Bachelor's degree or equivalent") is None
    assert server._matches_education("B.Tech, IIT Bombay", "Bachelor's degree or equivalent") is True
    assert server._matches_education("B.Tech, IIT Bombay", "Master's or higher") is False


def test_unknown_location_does_not_fail_the_filter():
    assert server._matches_location("", {"bengaluru"}) is None
    assert server._matches_location("Bengaluru", {"bengaluru"}) is True
    assert server._matches_location("Gurgaon", {"bengaluru"}) is False
    assert server._matches_location("Remote", {"remote"}) is True


def test_a_self_applied_candidate_is_not_silently_filtered_out(client, slug):
    """They have no parsed education, location or notice period."""
    client.post(f"/api/apply/{slug}", json=GOOD_APPLICATION)
    applicant = next(x for x in client.get("/api/candidates").json()["items"]
                     if x["email"] == GOOD_APPLICATION["email"])
    result = server._evaluate_filters([applicant], {
        "min_experience_years": 3,
        "education_preference": "Bachelor's degree or equivalent",
        "notice_period_max_days": 30,
        "locations": ["Bengaluru"],
    })
    assert result["passing"] == 1
    assert result["unknown"]["unknown_education"] == 1
    assert result["unknown"]["unknown_notice"] == 1
    assert result["unknown"]["unknown_location"] == 1


def test_unknowns_are_reported_so_the_recruiter_can_see_them(client):
    r = client.post("/api/candidates/preview-filter",
                    json={"filters": {"education_preference": "Tier-1 institute (IIT/NIT/IIIT/BITS)"}}).json()
    assert "unknown" in r and set(r["unknown"]) == {
        "unknown_education", "unknown_notice", "unknown_location"}
