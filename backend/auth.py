"""Authentication primitives.

Deliberately free of database and FastAPI imports so it can be unit-tested on
its own; the routes and the request dependency live in server.py next to `db`.

Design notes:
  * Sessions are opaque random tokens stored server-side, not JWTs. Signing out
    and revoking a compromised session both have to actually work, and a stolen
    JWT stays valid until it expires.
  * The token is delivered in an httpOnly cookie, so page JavaScript — and
    therefore any XSS — cannot read it.
"""
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt

SESSION_COOKIE = "credhr_session"
SESSION_TTL_HOURS = 12
MIN_PASSWORD_LENGTH = 12

# Login throttling — bcrypt is slow by design, but not slow enough to make an
# online guessing attack impractical on its own.
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 900


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    if not password or not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def password_problem(password: str) -> str | None:
    """Return a reason the password is unacceptable, or None if it's fine."""
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if password.lower() in {"password", "changeme", "letmein"} or password.isdigit():
        return "Password is too easily guessed."
    return None


def new_session_token() -> str:
    """URL-safe, 256 bits of entropy."""
    return secrets.token_urlsafe(32)


def token_fingerprint(token: str) -> str:
    """What we store. A leaked database dump then yields no usable sessions.

    Plain SHA-256 rather than bcrypt: the token is already high-entropy random,
    so there is nothing to brute-force, and lookups stay a single indexed query.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def session_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)


def is_expired(expires_at: str) -> bool:
    try:
        return datetime.fromisoformat(expires_at) <= datetime.now(timezone.utc)
    except (TypeError, ValueError):
        return True


def cookie_settings() -> dict:
    """Cookie flags for set_cookie.

    SameSite=None is required when the API and the app are served from
    different origins, and browsers only accept it alongside Secure — so it is
    used only when COOKIE_SECURE is on. Local http development falls back to
    Lax, which works because the ports share a site.
    """
    secure = os.environ.get("COOKIE_SECURE", "").lower() in ("1", "true", "yes")
    return {
        "httponly": True,
        "secure": secure,
        "samesite": "none" if secure else "lax",
        "max_age": SESSION_TTL_HOURS * 3600,
        "path": "/",
    }
