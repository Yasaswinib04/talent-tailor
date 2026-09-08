"""What the port brought over from the UAT branch, tested against this API.

Three things here are regressions that were live in production, not
hypotheticals — each one is pinned by a test that fails against the old code:

  1. Skills were matched with `alias in text`, so "HTML" produced Machine
     Learning and "available" produced AI.
  2. Degrees were matched the same way, so "IIT Bombay" contained "mba" and a
     B.Tech satisfied a Master's filter.
  3. The batch cap was 20 server-side and silently truncated in the browser.

Runs against an in-memory Mongo — no server, no database, no API key.
"""
import io

import pytest

import server
import skills as skills_lib
from conftest import make_job


def upload(client, job_id, files):
    payload = [
        ("files", (name, io.BytesIO(body.encode() if isinstance(body, str) else body), "text/plain"))
        for name, body in files
    ]
    return client.post(f"/api/jobs/{job_id}/upload-resumes", files=payload)


def resume(name, email, *, skills="React, TypeScript", years=6, edu="B.Tech, IIT Bombay"):
    return f"{name}\n{email}\nSenior Engineer at Acme\n{years} years experience\n{edu}\n{skills}\n"


# ---------- 1. Phantom skills ----------
# The dictionary these replaced mapped "ml" -> Machine Learning and "ai" -> AI/ML
# with no word boundary, so ordinary English produced skills nobody wrote down.
PHANTOMS = [
    ("HTML and CSS for the marketing site", "Machine Learning", ["HTML", "CSS"]),
    ("Strong JavaScript fundamentals", "Java", ["JavaScript"]),
    ("Available immediately, detail-oriented", "AI/ML", []),
    ("We're going to categorise payments", "Golang", ["UPI / Payments"]),
]


@pytest.mark.parametrize("text,phantom,expected", PHANTOMS, ids=[p[1] for p in PHANTOMS])
def test_ordinary_english_does_not_invent_skills(text, phantom, expected):
    found = server._dictionary_skills(text)
    assert phantom not in found, f"{text!r} still yields the phantom {phantom!r}"
    for want in expected:
        assert want in found, f"{text!r} lost the real skill {want!r}"


def test_the_real_skills_are_still_found():
    found = server._dictionary_skills("React, TypeScript and GraphQL; ML experience a plus")
    assert {"React", "TypeScript", "GraphQL", "Machine Learning"} <= set(found)


def test_jd_extraction_uses_the_taxonomy(client):
    """The recruiter-facing path, not just the helper."""
    r = client.post("/api/extract-skills", json={"jd": "Build our HTML email templates. React required."})
    assert r.status_code == 200
    names = {s["name"] for s in r.json()["skills"]}
    assert "Machine Learning" not in names
    assert "React" in names


def test_a_public_application_does_not_invent_skills(client):
    """The candidate-facing fallback shares the helper — pin it separately,
    because it is the one path a stranger can reach."""
    job = make_job(client)
    r = client.post(f"/api/apply/{job['share_slug']}", json={
        "name": "Priya Nair",
        "email": "priya@example.com",
        "phone": "",
        "current_title": "Email developer",
        "current_company": "Acme",
        "experience_years": 4,
        "expected_ctc": 2000000,
        "notice_period": "30 days",
        "location": "Bengaluru",
        "education": "B.Tech",
        "skills": [],
        "resume_text": "I write HTML emails and maintain a detailed style guide.",
    })
    assert r.status_code == 200, r.text
    got = set(client.get("/api/candidates").json()[0]["skills"])
    assert "Machine Learning" not in got and "AI/ML" not in got
    assert "HTML" in got


# ---------- 2. Degrees ----------
@pytest.mark.parametrize("edu,level,note", [
    ("B.Tech, IIT Bombay", 1, "'mba' hides inside 'Bombay'"),
    ("B.E. Computer Science, Bengaluru", 1, "'b.e.' hides inside 'Bengaluru'"),
    ("MBA, IIM Ahmedabad", 2, "a real MBA still reads as a master's"),
    ("M.Tech, IIT Delhi", 2, "a real M.Tech still reads as a master's"),
    ("PhD, IISc", 3, "a doctorate still reads as one"),
    ("MS Computer Science, Stanford", 2, "'ms' with no trailing space still counts"),
])
def test_degree_level_is_word_matched(edu, level, note):
    assert server._education_level(edu) == level, note


def test_a_btech_does_not_satisfy_a_masters_filter():
    """The failure that mattered: an inflated degree clears a filter it should
    not, and the recruiter never learns the shortlist was wrong."""
    assert server._matches_education("B.Tech, IIT Bombay", "Master's degree or higher") is False
    assert server._matches_education("MBA, IIM Ahmedabad", "Master's degree or higher") is True


def test_missing_education_never_rejects():
    """A parsing miss must not read as a failed requirement — in screening, a
    false negative costs a hire and is invisible."""
    for unknown in ("", "—", "n/a", "unknown"):
        assert server._matches_education(unknown, "Master's degree or higher") is True


# ---------- 3. The batch cap ----------
def test_ten_resumes_are_accepted(client):
    job_id = make_job(client)["id"]
    files = [(f"cv{i}.txt", resume(f"Person Number{i}", f"p{i}@example.com")) for i in range(10)]
    r = upload(client, job_id, files)
    assert r.status_code == 200, r.text
    assert r.json()["ranked"] == 10


def test_the_eleventh_resume_is_refused(client):
    """Enforced server-side because the browser limit is only a courtesy — a
    hand-rolled fetch bypasses it."""
    job_id = make_job(client)["id"]
    files = [(f"cv{i}.txt", resume(f"Person Number{i}", f"p{i}@example.com")) for i in range(11)]
    r = upload(client, job_id, files)
    assert r.status_code == 413
    assert "10" in r.json()["detail"]


def test_repeated_batches_are_rate_limited(client):
    job_id = make_job(client)["id"]
    one = [("cv.txt", resume("Solo Person", "solo@example.com"))]
    codes = [upload(client, job_id, one).status_code
             for _ in range(server.BULK_BATCHES_PER_MINUTE + 2)]
    assert 429 in codes, "a loop over a resume folder should eventually be throttled"
    assert codes[0] == 200, "the first batch must not be throttled"


def test_the_same_person_twice_is_attached_not_duplicated(client):
    job_id = make_job(client)["id"]
    upload(client, job_id, [("a.txt", resume("Aarti Deshpande", "aarti@example.com"))])
    upload(client, job_id, [("b.txt", resume("Aarti Deshpande", "aarti@example.com"))])
    assert len(client.get("/api/candidates").json()) == 1


# ---------- Tenancy ----------
def test_one_recruiter_cannot_see_anothers_candidates(client, second_client):
    """Every query is scoped by owner_id. This is the test that fails loudly if
    a new endpoint forgets the scope."""
    job_id = make_job(client)["id"]
    upload(client, job_id, [("a.txt", resume("Aarti Deshpande", "aarti@example.com"))])

    assert len(client.get("/api/candidates").json()) == 1
    assert second_client.get("/api/candidates").json() == []
    assert second_client.get("/api/jobs").json() == []
    assert second_client.get(f"/api/jobs/{job_id}").status_code == 404


def test_every_recruiter_endpoint_requires_a_token():
    """Walks the real route table, so an endpoint added later without a guard
    fails here rather than quietly serving candidate PII."""
    from fastapi.testclient import TestClient

    # Public by design: candidates applying through a share link have no
    # account, and you cannot require a session to create one.
    public = {"/api/health", "/api/auth/signup", "/api/auth/login",
              "/api/jobs/share/{slug}", "/api/apply/{slug}",
              "/api/apply/{slug}/parse-resume", "/api/visitors"}
    unguarded = []
    with TestClient(server.app, raise_server_exceptions=False) as c:
        for route in server.app.routes:
            path = getattr(route, "path", "")
            if not path.startswith("/api") or path in public:
                continue
            for method in sorted(getattr(route, "methods", set()) - {"HEAD", "OPTIONS"}):
                url = path.replace("{job_id}", "x").replace("{cid}", "x").replace("{slug}", "x")
                r = c.request(method, url)
                if r.status_code != 401:
                    unguarded.append(f"{method} {path} -> {r.status_code}")
    assert not unguarded, "endpoints reachable without a session: " + ", ".join(unguarded)


# ---------- The taxonomy is wired to the same source as the editor ----------
def test_server_and_editor_share_one_taxonomy():
    """If these ever diverge, a recruiter can type a skill the extractor will
    never produce, and the two halves of the feature disagree silently."""
    assert skills_lib.canonicalise("reactjs") == "React"
    assert "React" in server._dictionary_skills("We use ReactJS in production")


# ---------- A role must be able to rank ----------
def test_a_role_created_from_a_jd_can_actually_rank(client):
    """A role with no skills scores everyone identically, so the shortlist looks
    ranked while carrying no signal. The wizard extracts skills before
    publishing; nothing else did, so a role created any other way ranked flat."""
    job = make_job(client)
    assert job["skills"], "a role created from a JD must carry skills to score against"

    upload(client, job["id"], [
        ("match.txt", resume("Aarti Deshpande", "aarti@example.com",
                             skills="React, TypeScript, GraphQL")),
        ("nomatch.txt", resume("Rohan Mehta", "rohan@example.com",
                               skills="Python, Django, PostgreSQL")),
    ])
    by_name = {c["name"]: c["match_score"] for c in client.get("/api/candidates").json()}
    assert by_name["Aarti Deshpande"] > by_name["Rohan Mehta"], (
        f"the candidate matching the role's skills must outrank the one who does not: {by_name}"
    )


def test_an_explicit_skill_list_is_not_overwritten(client):
    """Deriving from the JD is a fallback, never a correction — a recruiter who
    edited the list keeps exactly what they chose."""
    job = make_job(client, skills=[{"name": "Kubernetes", "weight": 5}])
    assert [s["name"] for s in job["skills"]] == ["Kubernetes"]
