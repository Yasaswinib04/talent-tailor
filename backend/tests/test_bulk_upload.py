"""Recruiter bulk resume upload — runs fully locally, no server required.

    pip install -r backend/tests/requirements.txt
    pytest backend/tests/test_bulk_upload.py
"""
import io
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")
# Endpoints require a session; bootstrap an admin and sign in for each test.
os.environ["ADMIN_EMAIL"] = "maya@cred.club"
os.environ["ADMIN_PASSWORD"] = "correct horse battery staple"

from mongomock_motor import AsyncMongoMockClient  # noqa: E402
import motor.motor_asyncio as motor_asyncio  # noqa: E402

motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


RESUME = """Aarti Deshpande
aarti.deshpande@cv.in | +91 98450 22118

Senior Frontend Engineer at Razorpay
7 years of experience building consumer web at scale.
Skills: React, TypeScript, Next.js, design systems, performance optimization.
B.Tech, IIT Bombay
Notice period: 30 days
Expected CTC: 42 LPA
"""


@pytest.fixture()
def client():
    server.client = AsyncMongoMockClient()
    server.db = server.client["test"]
    server._upload_history.clear()
    with TestClient(server.app, raise_server_exceptions=False) as c:
        r = c.post("/api/auth/login", json={"email": "maya@cred.club",
                                            "password": "correct horse battery staple"})
        assert r.status_code == 200, f"test sign-in failed: {r.text}"
        yield c


@pytest.fixture()
def job_id(client):
    return client.get("/api/jobs").json()[0]["id"]


def upload(client, job_id, files):
    payload = [("files", (name, io.BytesIO(body if isinstance(body, bytes) else body.encode()), "application/octet-stream"))
               for name, body in files]
    return client.post(f"/api/jobs/{job_id}/bulk-upload", files=payload)


def docx_resume(lines):
    import docx

    d = docx.Document()
    for line in lines:
        d.add_paragraph(line)
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


# ---------- The batch limit ----------
def test_batch_of_ten_is_accepted(client, job_id):
    files = [(f"cv{i}.txt", f"Person Number{i}\np{i}@cv.in\nEngineer at Co\n3 years\nReact\n") for i in range(10)]
    r = upload(client, job_id, files)
    assert r.status_code == 200
    assert r.json()["created"] == 10


def test_eleventh_file_is_rejected(client, job_id):
    files = [(f"cv{i}.txt", f"Person Number{i}\np{i}@cv.in\n3 years\nReact\n") for i in range(11)]
    r = upload(client, job_id, files)
    assert r.status_code == 413
    assert "10 resumes at a time" in r.json()["detail"]


def test_limit_is_reported_in_the_response(client, job_id):
    r = upload(client, job_id, [("cv.txt", RESUME)])
    assert r.json()["limit"] == server.MAX_BULK_FILES == 10


def test_no_files_is_rejected(client, job_id):
    assert client.post(f"/api/jobs/{job_id}/bulk-upload", files=[]).status_code >= 400


def test_rate_limit_after_repeated_batches(client, job_id):
    codes = [upload(client, job_id, [("cv.txt", "A B\nx@y.in\n2 years\nReact\n")]).status_code
             for _ in range(server.RATE_LIMIT_BATCHES + 2)]
    assert 429 in codes
    assert codes.count(200) == server.RATE_LIMIT_BATCHES


# ---------- Parsing ----------
def test_fields_are_parsed_from_the_file(client, job_id):
    upload(client, job_id, [("aarti.txt", RESUME)])
    c = next(x for x in client.get("/api/candidates").json() if x["email"] == "aarti.deshpande@cv.in")
    assert c["name"] == "Aarti Deshpande"
    assert c["current_title"] == "Senior Frontend Engineer"
    assert c["current_company"] == "Razorpay"
    assert c["experience_years"] == 7.0
    assert c["education"] == "B.Tech, IIT Bombay"
    assert c["notice_period"] == "30 days"
    assert c["expected_ctc"] == 4200000
    assert {"React", "TypeScript", "Next.js"} <= set(c["skills"])
    assert c["source"] == "bulk_upload"
    assert c["source_filename"] == "aarti.txt"


def test_degree_regex_does_not_match_city_names():
    # "B.E." without its trailing dot happily matches the "Be" in "Bengaluru".
    assert server.DEGREE_RE.search("Bengaluru, India") is None
    assert server.DEGREE_RE.search("B.Tech, IIT Bombay").group(1) == "B.Tech, IIT Bombay"


def test_docx_is_parsed(client, job_id):
    body = docx_resume(["Kavita Rangan", "kavita.r@cv.in", "UX Researcher at Zomato",
                        "4 years experience", "usability testing, Figma", "M.Des, IDC IIT Bombay"])
    r = upload(client, job_id, [("kavita.docx", body)])
    assert r.json()["created"] == 1
    assert r.json()["results"][0]["name"] == "Kavita Rangan"


def test_candidate_is_scored_against_the_role(client, job_id):
    r = upload(client, job_id, [("aarti.txt", RESUME)])
    assert 0 <= r.json()["results"][0]["match_score"] <= 100


# ---------- Per-file failure handling ----------
def test_one_bad_file_does_not_fail_the_batch(client, job_id):
    r = upload(client, job_id, [("good.txt", RESUME), ("bad.txt", "To whom it may concern.\n")])
    d = r.json()
    assert r.status_code == 200
    assert d["created"] == 1 and d["failed"] == 1
    assert "name or email" in d["results"][1]["reason"]


def test_unsupported_type_is_rejected_with_a_reason(client, job_id):
    d = upload(client, job_id, [("scan.png", b"\x89PNG\r\n\x1a\n")]).json()
    assert d["failed"] == 1
    assert "Unsupported" in d["results"][0]["reason"]


def test_empty_file_is_rejected(client, job_id):
    d = upload(client, job_id, [("empty.txt", b"")]).json()
    assert d["results"][0]["reason"] == "File is empty"


def test_oversize_file_is_rejected(client, job_id):
    d = upload(client, job_id, [("huge.txt", b"x" * (server.MAX_FILE_BYTES + 1))]).json()
    assert d["failed"] == 1 and "Larger than" in d["results"][0]["reason"]


def test_unknown_role_returns_404(client):
    assert upload(client, "does-not-exist", [("cv.txt", RESUME)]).status_code == 404


# ---------- Duplicates and counts ----------
def test_same_person_twice_is_not_duplicated(client, job_id):
    upload(client, job_id, [("cv.txt", RESUME)])
    d = upload(client, job_id, [("cv-again.txt", RESUME)]).json()
    assert d["created"] == 0 and d["duplicates"] == 1
    matches = [x for x in client.get("/api/candidates").json() if x["email"] == "aarti.deshpande@cv.in"]
    assert len(matches) == 1


def test_existing_candidate_is_attached_to_the_new_role(client):
    jobs = client.get("/api/jobs").json()
    first, second = jobs[0]["id"], jobs[1]["id"]
    upload(client, first, [("cv.txt", RESUME)])
    d = upload(client, second, [("cv.txt", RESUME)]).json()
    assert d["duplicates"] == 1
    c = next(x for x in client.get("/api/candidates").json() if x["email"] == "aarti.deshpande@cv.in")
    assert first in c["role_ids"] and second in c["role_ids"]


def test_role_count_matches_reality_after_uploads(client, job_id):
    upload(client, job_id, [("a.txt", RESUME), ("b.txt", "Manish Gupta\nm@cv.in\n4 years\nReact\n")])
    job = client.get(f"/api/jobs/{job_id}").json()
    assert job["candidates_count"] == len(client.get(f"/api/candidates?job_id={job_id}").json())


def test_role_count_updates_when_a_duplicate_is_attached(client):
    jobs = client.get("/api/jobs").json()
    first, second = jobs[0]["id"], jobs[1]["id"]
    upload(client, first, [("cv.txt", RESUME)])
    before = client.get(f"/api/jobs/{second}").json()["candidates_count"]
    upload(client, second, [("cv.txt", RESUME)])  # duplicate, but joins this role
    after = client.get(f"/api/jobs/{second}").json()["candidates_count"]
    assert after == before + 1
    assert after == len(client.get(f"/api/candidates?job_id={second}").json())
