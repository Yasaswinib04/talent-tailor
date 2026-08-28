"""Regression tests for the P0 issues found in the 2026-08-08 UAT.

    pip install -r backend/requirements.txt -r backend/tests/requirements.txt
    pytest backend/tests/test_p0_fixes.py
"""
import importlib
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")

from mongomock_motor import AsyncMongoMockClient  # noqa: E402
import motor.motor_asyncio as motor_asyncio  # noqa: E402

motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture()
def client():
    server.client = AsyncMongoMockClient()
    server.db = server.client["test"]
    server._upload_history.clear()
    with TestClient(server.app, raise_server_exceptions=False) as c:
        yield c


# ---------- P0-2: missing config must explain itself ----------
def test_missing_env_var_raises_a_readable_error(monkeypatch):
    monkeypatch.delenv("MONGO_URL", raising=False)
    with pytest.raises(RuntimeError) as exc:
        server._required_env("MONGO_URL", "mongodb://localhost:27017")
    message = str(exc.value)
    assert "MONGO_URL is not set" in message
    assert ".env.example" in message


def test_env_example_documents_exactly_what_the_code_reads():
    root = os.path.join(os.path.dirname(__file__), "..", "..")
    example = open(os.path.join(root, ".env.example")).read()
    for name in ("MONGO_URL", "DB_NAME", "CORS_ORIGINS", "REACT_APP_BACKEND_URL"):
        assert name in example, f"{name} is read by the code but missing from .env.example"
    for stale in ("GEMINI_API_KEY", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        assert stale not in example, f"{stale} is documented but no code reads it"


def test_cors_never_pairs_a_wildcard_origin_with_credentials():
    cors = next(m for m in server.app.user_middleware if "CORS" in str(m))
    opts = cors.kwargs if hasattr(cors, "kwargs") else cors.options
    if "*" in opts["allow_origins"]:
        assert opts["allow_credentials"] is False


# ---------- P0-4: optional payload fields must not 500 ----------
def test_create_job_without_filters_or_weights(client):
    r = client.post("/api/jobs", json={"title": "QA Role", "department": "Engineering", "location": "Bengaluru"})
    assert r.status_code == 200, r.text
    assert r.json()["filters"] == {} and r.json()["scoring_weights"] == {}


def test_create_job_with_explicit_nulls_is_rejected_not_crashed(client):
    r = client.post("/api/jobs", json={"title": "X", "department": "E", "location": "B",
                                       "filters": None, "scoring_weights": None})
    assert r.status_code != 500, "null must not reach the Job model as a 500"


# ---------- P0-5: PATCH must not rewrite identity ----------
@pytest.fixture()
def job(client):
    return client.post("/api/jobs", json={"title": "Patch target", "department": "E", "location": "B"}).json()


def test_patch_cannot_overwrite_the_job_id(client, job):
    r = client.patch(f"/api/jobs/{job['id']}", json={"id": "spoofed"})
    assert r.status_code == 422
    assert client.get(f"/api/jobs/{job['id']}").status_code == 200
    assert not any(j["id"] == "spoofed" for j in client.get("/api/jobs").json())


def test_patch_cannot_overwrite_the_share_slug(client, job):
    assert client.patch(f"/api/jobs/{job['id']}", json={"share_slug": "aaaa"}).status_code == 422
    assert client.get(f"/api/jobs/{job['id']}").json()["share_slug"] == job["share_slug"]


def test_patch_rejects_unknown_fields(client, job):
    assert client.patch(f"/api/jobs/{job['id']}", json={"evil": True}).status_code == 422


def test_patch_still_applies_legitimate_edits(client, job):
    r = client.patch(f"/api/jobs/{job['id']}", json={"title": "Renamed", "status": "closed"})
    assert r.status_code == 200
    assert r.json()["title"] == "Renamed" and r.json()["status"] == "closed"
    assert r.json()["id"] == job["id"]


def test_candidate_patch_cannot_overwrite_identity_or_score(client):
    cid = client.get("/api/candidates").json()[0]["id"]
    for payload in ({"id": "spoofed"}, {"match_score": 100}, {"auto_applied": True}, {"source": "x"}):
        assert client.patch(f"/api/candidates/{cid}", json=payload).status_code == 422, payload
    assert client.get(f"/api/candidates/{cid}").status_code == 200


def test_candidate_patch_validates_rating_and_experience(client):
    cid = client.get("/api/candidates").json()[0]["id"]
    assert client.patch(f"/api/candidates/{cid}", json={"rating": 99}).status_code == 422
    assert client.patch(f"/api/candidates/{cid}", json={"rating": -1}).status_code == 422
    assert client.patch(f"/api/candidates/{cid}", json={"experience_years": -5}).status_code == 422
    assert client.patch(f"/api/candidates/{cid}", json={"rating": 4}).status_code == 200


def test_candidate_patch_rejects_an_invalid_stage(client):
    cid = client.get("/api/candidates").json()[0]["id"]
    assert client.patch(f"/api/candidates/{cid}", json={"stage": "Banana"}).status_code == 422
    assert client.patch(f"/api/candidates/{cid}", json={"stage": "Offer"}).status_code == 200


def test_empty_patch_is_rejected(client, job):
    assert client.patch(f"/api/jobs/{job['id']}", json={}).status_code == 400


def test_patch_on_unknown_id_is_404_not_500(client):
    assert client.patch("/api/jobs/nope", json={"title": "X"}).status_code == 404
    assert client.patch("/api/candidates/nope", json={"notes": "X"}).status_code == 404


def test_notes_and_roles_still_save(client):
    cands = client.get("/api/candidates").json()
    jobs = client.get("/api/jobs").json()
    cid = cands[0]["id"]
    assert client.patch(f"/api/candidates/{cid}", json={"notes": "Strong hire"}).json()["notes"] == "Strong hire"
    r = client.patch(f"/api/candidates/{cid}", json={"role_ids": [jobs[0]["id"], jobs[1]["id"]]})
    assert r.status_code == 200 and len(r.json()["role_ids"]) == 2


# ---------- Stage must be one of the five the UI knows about ----------
def test_post_stage_rejects_an_unknown_value(client):
    cid = client.get("/api/candidates").json()[0]["id"]
    before = client.get(f"/api/candidates/{cid}").json()["stage"]
    for bad in ("Banana", "", "  ", "<script>"):
        assert client.post(f"/api/candidates/{cid}/stage", json={"stage": bad}).status_code == 422, bad
    assert client.get(f"/api/candidates/{cid}").json()["stage"] == before


def test_post_stage_still_accepts_the_real_stages(client):
    cid = client.get("/api/candidates").json()[0]["id"]
    for stage in ("New", "Shortlisted", "Interview", "Offer", "Rejected"):
        r = client.post(f"/api/candidates/{cid}/stage", json={"stage": stage})
        assert r.status_code == 200 and r.json()["stage"] == stage


def test_every_candidate_stays_countable_in_the_funnel(client):
    cid = client.get("/api/candidates").json()[0]["id"]
    client.post(f"/api/candidates/{cid}/stage", json={"stage": "Banana"})
    summary = client.get("/api/analytics/summary").json()
    assert sum(summary["funnel"].values()) == summary["total_candidates"]
