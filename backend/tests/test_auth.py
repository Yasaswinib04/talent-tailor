"""Authentication and endpoint protection.

The point of this suite is the coverage test at the bottom: it walks the app's
own route table, so a new endpoint added without a guard fails the build rather
than quietly exposing candidate data.
"""
import os
import re
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")
os.environ["ADMIN_EMAIL"] = "maya@cred.club"
os.environ["ADMIN_PASSWORD"] = "correct horse battery staple"

from mongomock_motor import AsyncMongoMockClient  # noqa: E402
import motor.motor_asyncio as motor_asyncio  # noqa: E402

motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient

import auth  # noqa: E402
import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

ADMIN = {"email": "maya@cred.club", "password": "correct horse battery staple"}

# Open by design: a liveness probe and the two candidate-facing routes.
PUBLIC_PATHS = {"/api/health", "/api/jobs/share/{slug}", "/api/apply/{slug}"}


@pytest.fixture()
def client():
    server.client = AsyncMongoMockClient()
    server.db = server.client["test"]
    server._login_attempts.clear()
    server._upload_history.clear()
    with TestClient(server.app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture()
def signed_in(client):
    assert client.post("/api/auth/login", json=ADMIN).status_code == 200
    return client


# ---------- Nothing leaks without a session ----------
def test_every_recruiter_endpoint_requires_a_session(client):
    """Walks the real route table — a new unguarded endpoint fails here."""
    unguarded = []
    for route in server.app.routes:
        path = getattr(route, "path", "")
        if not path.startswith("/api") or path in PUBLIC_PATHS or path.startswith("/api/auth"):
            continue
        for method in sorted(getattr(route, "methods", set()) - {"HEAD", "OPTIONS"}):
            url = re.sub(r"\{[^}]+\}", "probe-id", path)
            r = client.request(method, url, json={})
            if r.status_code != 401:
                unguarded.append(f"{method} {path} -> {r.status_code}")
    assert not unguarded, "These endpoints answered without a session:\n  " + "\n  ".join(unguarded)


def test_candidate_data_is_not_public(client):
    for url in ("/api/candidates", "/api/jobs", "/api/analytics/summary"):
        r = client.get(url)
        assert r.status_code == 401
        assert "email" not in r.text and "expected_ctc" not in r.text


def test_public_routes_stay_public(client):
    assert client.get("/api/health").status_code == 200
    # Unknown slug is a 404, not a 401 — proving the route ran without a session.
    assert client.get("/api/jobs/share/nope").status_code == 404


def test_candidates_can_still_apply_without_signing_in(client, signed_in):
    job = signed_in.get("/api/jobs").json()[0]
    signed_in.post("/api/auth/logout")
    r = client.post(f"/api/apply/{job['share_slug']}", json={
        "name": "Aarav Menon", "email": "aarav@cv.in", "phone": "+91 90000 00000",
        "current_title": "Engineer", "current_company": "Razorpay",
        "experience_years": 5, "expected_ctc": 4000000, "resume_text": "React TypeScript",
    })
    assert r.status_code == 200


# ---------- Sign-in ----------
def test_login_sets_an_httponly_cookie(client):
    r = client.post("/api/auth/login", json=ADMIN)
    assert r.status_code == 200
    assert r.json()["user"]["email"] == ADMIN["email"]
    assert "password_hash" not in r.text
    cookie = r.headers["set-cookie"]
    assert "HttpOnly" in cookie and auth.SESSION_COOKIE in cookie


def test_wrong_password_is_rejected(client):
    r = client.post("/api/auth/login", json={**ADMIN, "password": "wrong password here"})
    assert r.status_code == 401
    assert client.get("/api/candidates").status_code == 401


def test_unknown_and_known_emails_give_the_same_answer(client):
    a = client.post("/api/auth/login", json={"email": "nobody@cred.club", "password": "whatever12345"})
    b = client.post("/api/auth/login", json={**ADMIN, "password": "wrong password here"})
    assert a.status_code == b.status_code == 401
    assert a.json()["detail"] == b.json()["detail"]


def test_login_is_throttled_after_repeated_failures(client):
    codes = [client.post("/api/auth/login", json={**ADMIN, "password": f"bad guess {i}"}).status_code
             for i in range(auth.MAX_LOGIN_ATTEMPTS + 2)]
    assert 429 in codes
    # And the throttle must not be bypassable by then supplying the real password.
    assert client.post("/api/auth/login", json=ADMIN).status_code == 429


def test_successful_login_clears_the_throttle(client):
    for i in range(auth.MAX_LOGIN_ATTEMPTS - 1):
        client.post("/api/auth/login", json={**ADMIN, "password": f"bad guess {i}"})
    assert client.post("/api/auth/login", json=ADMIN).status_code == 200
    server._login_attempts.clear()


def test_me_returns_the_signed_in_user(signed_in):
    r = signed_in.get("/api/auth/me")
    assert r.status_code == 200 and r.json()["role"] == "admin"
    assert "password_hash" not in r.text


def test_logout_invalidates_the_session(signed_in):
    assert signed_in.get("/api/candidates").status_code == 200
    signed_in.post("/api/auth/logout")
    assert signed_in.get("/api/candidates").status_code == 401


def test_a_forged_cookie_is_rejected(client):
    client.cookies.set(auth.SESSION_COOKIE, auth.new_session_token())
    assert client.get("/api/candidates").status_code == 401


def test_expired_sessions_are_rejected(signed_in):
    import datetime

    import anyio

    assert signed_in.get("/api/candidates").status_code == 200
    past = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)).isoformat()
    anyio.run(lambda: server.db.sessions.update_many({}, {"$set": {"expires_at": past}}))
    assert signed_in.get("/api/candidates").status_code == 401


def test_an_expired_session_is_cleaned_up_on_use(signed_in):
    import datetime

    import anyio

    past = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)).isoformat()
    anyio.run(lambda: server.db.sessions.update_many({}, {"$set": {"expires_at": past}}))
    signed_in.get("/api/candidates")
    remaining = anyio.run(lambda: server.db.sessions.count_documents({}))
    assert remaining == 0


# ---------- Session storage ----------
def test_raw_session_token_is_never_stored(signed_in):
    import anyio
    token = signed_in.cookies.get(auth.SESSION_COOKIE)
    sessions = anyio.run(lambda: server.db.sessions.find({}).to_list(10))
    assert sessions
    for s in sessions:
        assert token not in str(s)
        assert s["token_fp"] == auth.token_fingerprint(token)


def test_passwords_are_hashed_not_stored(signed_in):
    import anyio
    users = anyio.run(lambda: server.db.users.find({}).to_list(10))
    for u in users:
        assert ADMIN["password"] not in str(u)
        assert u["password_hash"].startswith("$2b$")


# ---------- Account management ----------
def test_admin_can_add_a_recruiter_who_can_then_sign_in(signed_in, client):
    r = signed_in.post("/api/auth/users", json={
        "email": "Kunal@CRED.club", "name": "Kunal", "password": "another good passphrase"})
    assert r.status_code == 200
    assert r.json()["email"] == "kunal@cred.club", "email should be normalised"
    signed_in.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={
        "email": "kunal@cred.club", "password": "another good passphrase"}).status_code == 200


def test_weak_passwords_are_refused(signed_in):
    r = signed_in.post("/api/auth/users",
                       json={"email": "x@cred.club", "name": "X", "password": "short"})
    assert r.status_code == 400 and "12 characters" in r.json()["detail"]


def test_duplicate_email_is_refused(signed_in):
    assert signed_in.post("/api/auth/users", json={
        "email": ADMIN["email"], "name": "Copy", "password": "yet another passphrase"}).status_code == 409


def test_a_recruiter_cannot_create_accounts(signed_in, client):
    signed_in.post("/api/auth/users", json={
        "email": "rec@cred.club", "name": "Rec", "password": "recruiter passphrase ok"})
    signed_in.post("/api/auth/logout")
    client.post("/api/auth/login", json={"email": "rec@cred.club", "password": "recruiter passphrase ok"})
    r = client.post("/api/auth/users", json={
        "email": "sneaky@cred.club", "name": "S", "password": "sneaky passphrase ok"})
    assert r.status_code == 403
    # But an ordinary recruiter can still do their job.
    assert client.get("/api/candidates").status_code == 200


def test_password_change_requires_the_current_password(signed_in):
    assert signed_in.post("/api/auth/change-password", json={
        "current_password": "not it at all", "new_password": "a brand new passphrase"}).status_code == 401
    assert signed_in.post("/api/auth/change-password", json={
        "current_password": ADMIN["password"], "new_password": "short"}).status_code == 400
    assert signed_in.post("/api/auth/change-password", json={
        "current_password": ADMIN["password"], "new_password": "a brand new passphrase"}).status_code == 200
    # The session that made the change survives; the new password works.
    assert signed_in.get("/api/auth/me").status_code == 200
    signed_in.post("/api/auth/logout")
    assert signed_in.post("/api/auth/login", json={
        "email": ADMIN["email"], "password": "a brand new passphrase"}).status_code == 200


# ---------- Bootstrap ----------
def test_no_admin_is_created_without_env_credentials(monkeypatch):
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    server.client = AsyncMongoMockClient()
    server.db = server.client["test"]
    with TestClient(server.app, raise_server_exceptions=False) as c:
        assert c.post("/api/auth/login", json=ADMIN).status_code == 401
    os.environ["ADMIN_EMAIL"] = ADMIN["email"]
    os.environ["ADMIN_PASSWORD"] = ADMIN["password"]


def test_a_weak_admin_password_creates_no_account(monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "password")
    server.client = AsyncMongoMockClient()
    server.db = server.client["test"]
    with TestClient(server.app, raise_server_exceptions=False) as c:
        assert c.post("/api/auth/login", json={**ADMIN, "password": "password"}).status_code == 401
    os.environ["ADMIN_PASSWORD"] = ADMIN["password"]
