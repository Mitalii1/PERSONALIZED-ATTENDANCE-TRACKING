"""
routes_planner.py — the API surface for the attendance planner.

Register it in app.py:

    from routes_planner import planner_bp
    app.register_blueprint(planner_bp)

Every route here takes the user from the token, never from the URL.
"""

from __future__ import annotations

from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request

from auth import require_auth
from db import get_connection  # your existing helper
from planner import (
    DEFAULT_THRESHOLD_PERCENT,
    build_subject_plan,
    percentage,
    simulate_skip,
    term_skip_budget,
)

planner_bp = Blueprint("planner", __name__, url_prefix="/api/planner")


# --------------------------------------------------------------------- helpers

def _load_user_term(cursor, user_id: int):
    cursor.execute(
        "SELECT threshold_percent, term_start, term_end FROM users WHERE id = %s",
        (user_id,),
    )
    row = cursor.fetchone() or {}
    return (
        row.get("threshold_percent") or DEFAULT_THRESHOLD_PERCENT,
        row.get("term_start"),
        row.get("term_end"),
    )


def _weekday_counts(start: date, end: date, holidays: set[date]) -> dict[int, int]:
    """
    How many Mondays, Tuesdays... are left between two dates, minus holidays.

    Looping day by day is fine here: a semester is under 200 days, and the
    clever modular-arithmetic version is the kind of code that is wrong for
    three months before anyone notices.
    """
    counts = {d: 0 for d in range(1, 8)}
    if not start or not end or start > end:
        return counts
    cursor_day = start
    while cursor_day <= end:
        if cursor_day not in holidays:
            counts[cursor_day.isoweekday()] += 1
        cursor_day += timedelta(days=1)
    return counts


def _remaining_per_subject(cursor, user_id: int, term_end) -> dict[int, int]:
    """Scheduled classes still to come, per subject id."""
    start = max(date.today() + timedelta(days=1), date.today())
    if not term_end or start > term_end:
        return {}

    cursor.execute(
        "SELECT holiday_date FROM holidays WHERE user_id = %s OR user_id IS NULL",
        (user_id,),
    )
    holidays = {r["holiday_date"] for r in cursor.fetchall()}
    per_weekday = _weekday_counts(start, term_end, holidays)

    cursor.execute(
        """
        SELECT subject_id, day_of_week, COUNT(*) AS slots
        FROM timetable_schedule
        WHERE user_id = %s AND subject_id IS NOT NULL AND kind <> 'free'
        GROUP BY subject_id, day_of_week
        """,
        (user_id,),
    )
    remaining: dict[int, int] = {}
    for row in cursor.fetchall():
        remaining[row["subject_id"]] = remaining.get(row["subject_id"], 0) + (
            row["slots"] * per_weekday.get(row["day_of_week"], 0)
        )
    return remaining


def _load_plans(cursor, user_id: int):
    threshold, _term_start, term_end = _load_user_term(cursor, user_id)
    remaining = _remaining_per_subject(cursor, user_id, term_end)

    cursor.execute(
        """
        SELECT s.id, s.code, s.name,
               COALESCE(t.attended, 0) AS attended,
               COALESCE(t.held, 0)     AS held
        FROM subjects s
        LEFT JOIN v_subject_totals t
               ON t.subject_id = s.id AND t.user_id = s.user_id
        WHERE s.user_id = %s
        ORDER BY s.code
        """,
        (user_id,),
    )
    return threshold, [
        build_subject_plan(
            subject_id=r["id"],
            code=r["code"],
            name=r["name"],
            attended=int(r["attended"]),
            held=int(r["held"]),
            remaining=remaining.get(r["id"], 0),
            threshold_percent=threshold,
        )
        for r in cursor.fetchall()
    ]


# ---------------------------------------------------------------------- routes

@planner_bp.get("/overview")
@require_auth
def overview():
    """Everything the planner screen needs, in one round trip."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            threshold, plans = _load_plans(cur, g.user_id)

        attended = sum(p.attended for p in plans)
        held = sum(p.held for p in plans)
        remaining = sum(p.remaining for p in plans)

        return jsonify(
            {
                "threshold_percent": threshold,
                "overall": {
                    "attended": attended,
                    "held": held,
                    "remaining": remaining,
                    "current_percent": percentage(attended, held),
                    "term_skip_budget": term_skip_budget(
                        attended, held, remaining, threshold
                    ),
                },
                "subjects": [p.to_dict() for p in plans],
                "tightest": min(
                    (p.to_dict() for p in plans),
                    key=lambda p: (p["term_skip_budget"], p["current_percent"]),
                    default=None,
                ),
            }
        )
    finally:
        conn.close()


@planner_bp.post("/simulate")
@require_auth
def simulate():
    """
    Body: {"subject_id": 3, "skip_count": 2}
    Answers "can I skip Thursday's lab?" without writing anything.
    """
    body = request.get_json(silent=True) or {}
    subject_id = body.get("subject_id")
    skip_count = int(body.get("skip_count", 1))

    if not subject_id:
        return jsonify({"error": "Pick a subject to simulate."}), 400
    if not 1 <= skip_count <= 50:
        return jsonify({"error": "Simulate between 1 and 50 classes."}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            _threshold, plans = _load_plans(cur, g.user_id)
    finally:
        conn.close()

    plan = next((p for p in plans if p.subject_id == int(subject_id)), None)
    if plan is None:
        # Not "not found" — from this user's point of view it does not exist.
        return jsonify({"error": "Subject not found."}), 404

    return jsonify({"subject": plan.to_dict(), "result": simulate_skip(plan, skip_count)})


@planner_bp.put("/settings")
@require_auth
def update_settings():
    """Body: {"threshold_percent": 80, "term_start": "2026-07-15", "term_end": "2026-11-20"}"""
    body = request.get_json(silent=True) or {}
    threshold = body.get("threshold_percent", DEFAULT_THRESHOLD_PERCENT)

    if not isinstance(threshold, int) or not 1 <= threshold <= 100:
        return jsonify({"error": "Threshold must be a whole number between 1 and 100."}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE users
                      SET threshold_percent = %s, term_start = %s, term_end = %s
                    WHERE id = %s""",
                (threshold, body.get("term_start"), body.get("term_end"), g.user_id),
            )
        conn.commit()
    finally:
        conn.close()
    return jsonify({"saved": True})
