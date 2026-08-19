"""
Password hashing and API tokens — stdlib only, on purpose.

Render's free tier makes every extra native dependency (bcrypt, cryptography)
a build risk, and scrypt + HMAC from hashlib/hmac cover exactly what a
single-server bearer-token scheme needs. Swap for a JWT library the day
there is a second service that must verify tokens independently.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time

# Must be stable across restarts or every login dies with the process. If the
# operator hasn't set SECRET_KEY, derive one from the Mongo URL — stable per
# deployment, but rotating the DB password logs everyone out, so set it.
SECRET_KEY = os.environ.get("SECRET_KEY") or hashlib.sha256(
    ("talent-tailor::" + os.environ.get("MONGO_URL", "dev")).encode()
).hexdigest()

TOKEN_TTL_SECONDS = 30 * 24 * 3600

_SCRYPT = {"n": 2**14, "r": 8, "p": 1}


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_hex, digest_hex = stored.split("$")
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), **_SCRYPT)
        return hmac.compare_digest(digest.hex(), digest_hex)
    except Exception:
        return False


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_token(user_id: str) -> str:
    payload = _b64e(json.dumps({"uid": user_id, "exp": int(time.time()) + TOKEN_TTL_SECONDS}).encode())
    sig = _b64e(hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def read_token(token: str):
    """User id if the token is valid and unexpired, else None."""
    try:
        payload, sig = token.split(".")
        expected = _b64e(hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(_b64d(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data.get("uid")
    except Exception:
        return None
