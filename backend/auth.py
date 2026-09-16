"""JWT helpers for securing authenticated API routes."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_HOURS = int(os.getenv("ACCESS_TOKEN_HOURS", "12"))


def _secret() -> str:
    secret = os.getenv("JWT_SECRET") or JWT_SECRET
    if not secret:
        raise RuntimeError(
            "JWT_SECRET is not set. Add a long random value to backend/.env."
        )
    return secret


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
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def _read_bearer_token() -> str | None:
    header = request.headers.get("Authorization", "")
    return header[7:].strip() if header.startswith("Bearer ") else None


def require_auth(fn):
    """Require a valid Bearer token and expose its user id through Flask g."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _read_bearer_token()
        if not token:
            return jsonify({"error": "Sign in to continue."}), 401
        try:
            payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
            g.user_id = int(payload["sub"])
            g.user_email = payload.get("email")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Your session expired. Sign in again."}), 401
        except (jwt.InvalidTokenError, KeyError, ValueError):
            return jsonify({"error": "Sign in to continue."}), 401
        return fn(*args, **kwargs)

    return wrapper


def owns_or_403(cursor, table: str, row_id: int, user_id: int) -> bool:
    """Check that a resource row belongs to the authenticated user."""
    if table not in {"subjects", "timetable_schedule", "attendance"}:
        raise ValueError("Unsupported ownership table")
    cursor.execute(
        f"SELECT 1 FROM `{table}` WHERE id = %s AND user_id = %s LIMIT 1",
        (row_id, user_id),
    )
    return cursor.fetchone() is not None
