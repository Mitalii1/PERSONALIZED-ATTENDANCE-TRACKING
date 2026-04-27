import os
import re
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from timetable_ai import extract_subjects_from_image
from db import get_connection
from attendance import (
    get_timetable_week,
    get_timetable_week_with_details,
    get_todays_schedule,
    mark_attendance,
    get_attendance_summary,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__)
CORS(app)


def ensure_users_table():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            year VARCHAR(20) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
    )
    conn.commit()
    cursor.close()
    conn.close()


# ── Home ──────────────────────────────────────────────────────────────────────
@app.route("/")
def home():
    return "Attendance Backend Running"


# ── Signup ────────────────────────────────────────────────────────────────────
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        year = data.get("year", "").strip() or None

        if not name or not email or not password:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Name, email and password are required",
                    }
                ),
                400,
            )

        if len(password) < 6:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Password must be at least 6 characters",
                    }
                ),
                400,
            )

        ensure_users_table()
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing = cursor.fetchone()
        if existing:
            cursor.close()
            conn.close()
            return (
                jsonify({"success": False, "message": "Email already registered"}),
                409,
            )

        hashed_password = generate_password_hash(password)
        cursor.execute(
            """
            INSERT INTO users (name, email, password, year)
            VALUES (%s, %s, %s, %s)
            """,
            (name, email, hashed_password, year),
        )
        user_id = cursor.lastrowid
        conn.commit()
        cursor.close()
        conn.close()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Account created successfully!",
                    "user": {
                        "id": user_id,
                        "name": name,
                        "email": email,
                        "year": year,
                    },
                }
            ),
            201,
        )
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500


# ── Login ─────────────────────────────────────────────────────────────────────
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return (
                jsonify({"success": False, "message": "Email and password required"}),
                400,
            )

        ensure_users_table()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, email, password, year FROM users WHERE email = %s",
            (email,),
        )
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user or not check_password_hash(user["password"], password):
            return (
                jsonify({"success": False, "message": "Invalid email or password"}),
                401,
            )

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Login successful",
                    "user": {
                        "id": user["id"],
                        "name": user["name"],
                        "email": user["email"],
                        "year": user.get("year"),
                    },
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500


# ── Extract timetable from image ──────────────────────────────────────────────
@app.route("/api/timetable/extract", methods=["POST"])
def extract_timetable():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    allowed = {"png", "jpg", "jpeg", "webp"}
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        return jsonify({"error": f"File type '{ext}' not supported."}), 400

    # Only S1, S2, S3 are valid batches
    batch = request.form.get("batch", "").strip()
    if batch and batch not in ["S1", "S2", "S3"]:
        return (
            jsonify({"error": f"Invalid batch '{batch}'. Must be S1, S2, or S3."}),
            400,
        )

    try:
        image_bytes = file.read()
        result = extract_subjects_from_image(image_bytes, batch)

        # If AI extraction fails, return a gateway-style failure instead of success.
        if isinstance(result, dict) and result.get("error"):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": result.get("error"),
                        "data": {
                            "abbreviations": result.get("abbreviations", []),
                            "schedule": result.get("schedule", {}),
                            "raw_text": result.get("raw_text", ""),
                        },
                    }
                ),
                502,
            )

        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Helper: entries to skip (not real subjects) ───────────────────────────────
SKIP_ENTRIES = {
    "LIBRARY",
    "COUNSELLING",
    "BATCH",
    "MINOR",
    "CCRP",
    "VSB",
    "BREAK",
    "LUNCH",
    "DT",
    "SNZ",
    "BSZ",
    "SND",
    "GFM",
    "FKS",
    "NKS",
    "MPN",
    "AGS",
    "TGM",
    "SBT",
    "PS",
}


def should_skip(entry: str) -> bool:
    """Return True if this entry is not a real subject."""
    entry = entry.strip()
    batch_match = re.match(r"^[S][123][-\s](.+)", entry)
    if batch_match:
        first_word = batch_match.group(1).split("-")[0].split()[0].upper()
    else:
        first_word = entry.split()[0].upper()
    return first_word in SKIP_ENTRIES


def parse_abbreviation(entry: str) -> str:
    """
    Extract subject abbreviation from raw timetable entry.

    Batch-specific practicals (s1 slot):
      "S1-ADASL-MPN-503"         → "ADASL"
      "S1-PROGG IN JAVA-AGS-508" → "PROGG"
      "S1-CNL-SBT-507"           → "CNL"
      "S1-PDL-I-TGM-502"         → "PDL"

    Shared theory entries (s2, s3, a1, a2 slots):
      "PROGG IN JAVA AGS 505"    → "PROGG"
      "ADS MPN 505"              → "ADS"
      "DCCN SBT 505"             → "DCCN"
      "SEM SNZ 505"              → "SEM"
      "AMCS NKS 505"             → "AMCS"
    """
    entry = entry.strip()

    # Remove batch prefix: "S1-", "S2-", "S3-"
    batch_match = re.match(r"^[S][123][-\s](.+)", entry)
    if batch_match:
        rest = batch_match.group(1)
        parts = rest.split("-")
        subject_part = parts[0].strip()
        abbreviation = subject_part.split()[0].upper()
    else:
        abbreviation = entry.split()[0].upper()

    # Clean: PDL-I → PDL
    abbreviation = re.sub(r"[-]?I+$", "", abbreviation).strip()

    return abbreviation


# ── Save subjects + schedule to database ─────────────────────────────────────
@app.route("/api/timetable/save-subjects", methods=["POST"])
def save_subjects():
    data = request.get_json()
    user_id = data.get("user_id")
    subjects = data.get("subjects", [])
    schedule = data.get("schedule", {})

    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Clear old data for this user
        cursor.execute("DELETE FROM timetable_schedule WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM subjects WHERE user_id = %s", (user_id,))

        # Insert subjects and build lookup map: abbreviation/fullname → subject_id
        subject_id_map = {}

        for subject in subjects:
            name = subject.get("full", "").strip()
            short = subject.get("short", "").strip()
            types = subject.get("type", ["Theory"])

            if not name:
                continue

            if "Theory" in types and "Practical" in types:
                type_str = "Both"
            elif "Practical" in types:
                type_str = "Practical"
            else:
                type_str = "Theory"

            cursor.execute(
                """
                INSERT INTO subjects
                    (user_id, subject_name, type, total_classes, attended_classes)
                VALUES (%s, %s, %s, 0, 0)
            """,
                (user_id, name, type_str),
            )

            new_id = cursor.lastrowid
            # Map both short code and full name so either can match
            subject_id_map[short.upper()] = new_id
            subject_id_map[name.upper()] = new_id

        # Slot keys in order — s1 is always the practical slot (8:15-10:15)
        slot_keys = ["s1", "s2", "s3", "a1", "a2"]
        slot_times = {
            "s1": "8:15-10:15",
            "s2": "10:30-11:30",
            "s3": "11:30-12:30",
            "a1": "1:15-2:15",
            "a2": "2:15-3:15",
        }

        # Save schedule day by day
        for day, subject_list in schedule.items():
            slot_index = 0

            for raw_entry in subject_list:
                if slot_index >= len(slot_keys):
                    break

                # Skip junk entries (LIBRARY, COUNSELLING, MINOR etc.)
                # but still advance the slot counter
                if should_skip(raw_entry):
                    slot_index += 1
                    continue

                slot_key = slot_keys[slot_index]
                time_slot = slot_times[slot_key]

                # Special case for Friday practical — s2 spans 10:10-12:30
                if day == "Friday" and slot_key == "s2":
                    time_slot = "10:10-12:30"

                abbreviation = parse_abbreviation(raw_entry)
                subject_id = subject_id_map.get(abbreviation)

                if subject_id:
                    cursor.execute(
                        """
                        INSERT INTO timetable_schedule
                            (user_id, subject_id, day_of_week, slot_key, time_slot)
                        VALUES (%s, %s, %s, %s, %s)
                    """,
                        (user_id, subject_id, day, slot_key, time_slot),
                    )
                else:
                    print(f"⚠️  No match: '{raw_entry}' → '{abbreviation}'")
                    print(f"    Available keys: {list(subject_id_map.keys())}")

                slot_index += 1

        conn.commit()
        cursor.close()
        conn.close()

        return (
            jsonify(
                {
                    "success": True,
                    "message": f"{len(subjects)} subjects saved successfully",
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Get subjects for a user ───────────────────────────────────────────────────
@app.route("/api/subjects/<int:user_id>", methods=["GET"])
def get_subjects(user_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, subject_name, type, total_classes, attended_classes
            FROM subjects
            WHERE user_id = %s
            ORDER BY subject_name
        """,
            (user_id,),
        )

        subjects = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "subjects": subjects}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Get full week timetable (simple) ─────────────────────────────────────────
@app.route("/api/timetable/week/<int:user_id>", methods=["GET"])
def timetable_week(user_id):
    try:
        week = get_timetable_week(user_id)
        return jsonify({"success": True, "week": week}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Get full week timetable (with subject details) ────────────────────────────
@app.route("/api/timetable/week-details/<int:user_id>", methods=["GET"])
def timetable_week_details(user_id):
    try:
        week = get_timetable_week_with_details(user_id)
        return jsonify({"success": True, "week": week}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Get today's schedule ──────────────────────────────────────────────────────
@app.route("/api/attendance/today/<int:user_id>", methods=["GET"])
def todays_schedule(user_id):
    try:
        today = get_todays_schedule(user_id)
        return jsonify({"success": True, "data": today}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Mark attendance ───────────────────────────────────────────────────────────
@app.route("/api/attendance/mark", methods=["POST"])
def mark_student_attendance():
    data = request.get_json()
    user_id = data.get("user_id")
    records = data.get("records", [])

    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    if not records:
        return jsonify({"success": False, "error": "No records provided"}), 400

    try:
        saved = mark_attendance(user_id, records)
        return (
            jsonify(
                {"success": True, "message": f"Attendance marked for {saved} classes"}
            ),
            200,
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Update a single timetable slot ───────────────────────────────────────────
@app.route("/api/timetable/update-slot", methods=["PUT"])
def update_timetable_slot():
    """
    Auto-saves a single cell change in the timetable.
    {
      "user_id": 1,
      "day": "Monday",
      "slot_key": "s1",
      "subject_id": 3   ← null means empty/no class
    }
    """
    data = request.get_json()
    user_id = data.get("user_id")
    day = data.get("day")
    slot_key = data.get("slot_key")
    subject_id = data.get("subject_id")  # null = no class

    if not all([user_id, day, slot_key]):
        return (
            jsonify({"success": False, "error": "user_id, day, slot_key required"}),
            400,
        )

    slot_times = {
        "s1": "8:15-10:15",
        "s2": "10:30-11:30",
        "s3": "11:30-12:30",
        "a1": "1:15-2:15",
        "a2": "2:15-3:15",
    }

    if slot_key not in slot_times:
        return (
            jsonify({"success": False, "error": f"Invalid slot_key: {slot_key}"}),
            400,
        )

    try:
        conn = get_connection()
        cursor = conn.cursor()

        if subject_id is None:
            # User selected "No class" — delete this slot
            cursor.execute(
                """
                DELETE FROM timetable_schedule
                WHERE user_id = %s AND day_of_week = %s AND slot_key = %s
            """,
                (user_id, day, slot_key),
            )
        else:
            # Check if slot already exists
            cursor.execute(
                """
                SELECT id FROM timetable_schedule
                WHERE user_id = %s AND day_of_week = %s AND slot_key = %s
            """,
                (user_id, day, slot_key),
            )

            existing = cursor.fetchone()

            if existing:
                # Update existing slot
                cursor.execute(
                    """
                    UPDATE timetable_schedule
                    SET subject_id = %s
                    WHERE user_id = %s AND day_of_week = %s AND slot_key = %s
                """,
                    (subject_id, user_id, day, slot_key),
                )
            else:
                # Insert new slot
                cursor.execute(
                    """
                    INSERT INTO timetable_schedule
                        (user_id, subject_id, day_of_week, slot_key, time_slot)
                    VALUES (%s, %s, %s, %s, %s)
                """,
                    (user_id, subject_id, day, slot_key, slot_times[slot_key]),
                )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Slot updated"}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Attendance summary ────────────────────────────────────────────────────────
@app.route("/api/attendance/summary/<int:user_id>", methods=["GET"])
def attendance_summary(user_id):
    try:
        summary = get_attendance_summary(user_id)
        return jsonify({"success": True, "summary": summary}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
