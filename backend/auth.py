"""
auth.py — token issuing and route protection.

Why this file exists: right now the frontend keeps `pat-current-user` in
localStorage and every route takes the user id from the URL
(`/api/attendance/today/<user_id>`). Change the number in the URL and you are
reading somebody else's attendance. That is a textbook IDOR, and it is the kind
of thing an interviewer will find in thirty seconds.

After this change the user id comes from a signed token, never from the client.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt  # pip install pyjwt
from flask import g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_HOURS = int(os.getenv("ACCESS_TOKEN_HOURS", "12"))

if not JWT_SECRET:
    # Fail loudly at import time rather than silently signing with "secret".
    raise RuntimeError(
        "JWT_SECRET is not set. Add a long random value to backend/.env, e.g.\n"
        "  python -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )


def hash_password(raw: str) -> str:
    return generate_password_hash(raw, method="pbkdf2:sha256", salt_length=16)


def verify_password(stored_hash: str, raw: str) -> bool:
    return check_password_hash(stored_hash, raw)


def issue_token(user_id: int, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=ACCESS_TOKEN_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _read_bearer_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:].strip()
    return None


def require_auth(fn):
    """
    Decorator. Puts the authenticated user id on `g.user_id`.

        @app.get("/api/attendance/summary")
        @require_auth
        def summary():
            return jsonify(load_summary(g.user_id))

    Note the route no longer accepts a user id at all. There is nothing to forge.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _read_bearer_token()
        if not token:
            return jsonify({"error": "Sign in to continue."}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Your session expired. Sign in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Sign in to continue."}), 401

        g.user_id = int(payload["sub"])
        g.user_email = payload.get("email")
        return fn(*args, **kwargs)

    return wrapper


def owns_or_403(cursor, table: str, row_id: int, user_id: int) -> bool:
    """
    Second line of defence for routes that take a resource id (a subject id, a
    schedule slot id). The token proves who you are; this proves the row is yours.
    """
    cursor.execute(
        f"SELECT 1 FROM `{table}` WHERE id = %s AND user_id = %s LIMIT 1",
        (row_id, user_id),
    )
    return cursor.fetchone() is not None
