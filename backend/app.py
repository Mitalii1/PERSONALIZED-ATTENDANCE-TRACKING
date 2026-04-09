import os
from dotenv import load_dotenv
from flask import request, jsonify
from flask_cors import CORS
from timetable_ai import extract_subjects_from_image
from flask import Flask
import io
import re
from werkzeug.utils import secure_filename
from db import get_connection
from attendance import get_timetable_week, get_timetable_week_with_details, get_todays_schedule, mark_attendance, get_attendance_summary

load_dotenv()  

app = Flask(__name__)   
CORS(app)

# In-memory user storage (no database)
users = {}

@app.route("/")
def home():
    return "Attendance Backend Running"


# SIGNUP API
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.json
        # Just accept the data and return success - no validation, no storage
        return jsonify({"message": "Account created successfully!"}), 201
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500


# LOGIN API
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        if not email or not password:
            return jsonify({"message": "Email and password required"}), 400

        # Check user in memory
        if email in users and users[email]["password"] == password:
            return jsonify({"message": "Login successful", "user": users[email]}), 200
        else:
            return jsonify({"message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500

@app.route('/api/timetable/extract', methods=['POST'])
def extract_timetable():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    allowed = {'png', 'jpg', 'jpeg', 'webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in allowed:
        return jsonify({"error": f"File type '{ext}' not supported."}), 400

    # NEW: Get batch from form data
    batch = request.form.get('batch', '').strip()

    try:
        image_bytes = file.read()
        result = extract_subjects_from_image(image_bytes, batch)
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/timetable/save-subjects', methods=['POST'])
def save_subjects():
    data     = request.get_json()
    user_id  = data.get('user_id')
    subjects = data.get('subjects', [])
    schedule = data.get('schedule', {})

    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Clear old data
        cursor.execute("DELETE FROM timetable_schedule WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM subjects WHERE user_id = %s", (user_id,))

        # Insert subjects, store id by short code
        subject_id_map = {}

        for subject in subjects:
            name  = subject.get('full', '').strip()
            short = subject.get('short', '').strip()
            types = subject.get('type', ['Theory'])

            if not name:
                continue

            if 'Theory' in types and 'Practical' in types:
                type_str = 'Both'
            elif 'Practical' in types:
                type_str = 'Practical'
            else:
                type_str = 'Theory'

            cursor.execute("""
                INSERT INTO subjects 
                    (user_id, subject_name, type, total_classes, attended_classes)
                VALUES (%s, %s, %s, 0, 0)
            """, (user_id, name, type_str))

            subject_id_map[short] = cursor.lastrowid

        # Slot key to time label
        slot_times = {
            's1': '8:15-10:15',
            's2': '10:30-11:30',
            's3': '11:30-12:30',
            'a1': '1:15-2:15',
            'a2': '2:15-3:15',
        }

        # Insert schedule
        # schedule from frontend looks like:
        # { "Monday": ["ADASL", "PROGG", "SEM"], "Tuesday": [...] }
        for day, subject_list in schedule.items():
            slot_keys = ['s1', 's2', 's3', 'a1', 'a2']
            for i, short in enumerate(subject_list):
                if i >= len(slot_keys):
                    break
                slot_key   = slot_keys[i]
                time_slot  = slot_times[slot_key]
                subject_id = subject_id_map.get(short)

                if subject_id:
                    cursor.execute("""
                        INSERT INTO timetable_schedule 
                            (user_id, subject_id, day_of_week, slot_key, time_slot)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (user_id, subject_id, day, slot_key, time_slot))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"{len(subjects)} subjects saved successfully"
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ── Get subjects for a user ───────────────────────────────────────────────────

@app.route('/api/subjects/<int:user_id>', methods=['GET'])
def get_subjects(user_id):
    """Returns all subjects for a given user."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, subject_name, type, total_classes, attended_classes
            FROM subjects
            WHERE user_id = %s
            ORDER BY subject_name
        """, (user_id,))

        subjects = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "subjects": subjects}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/timetable/week/<int:user_id>', methods=['GET'])
def timetable_week(user_id):
    """
    Returns full week in format frontend expects:
    [
      { "day": "Monday", "s1": "Java", "s2": "Math", "s3": "DBMS", "a1": "Physics", "a2": "Seminar" },
      ...
    ]
    """
    try:
        week = get_timetable_week(user_id)
        return jsonify({"success": True, "week": week}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Get timetable with subject details ─────────────────────────────────────
@app.route('/api/timetable/week-details/<int:user_id>', methods=['GET'])
def timetable_week_details(user_id):
    """
    Returns full week with subject details (type, id, time_slot):
    [
      {
        "day": "Monday",
        "s1": { "subject_name": "Java", "type": "Theory", "subject_id": 1, "time_slot": "8:15-10:15" },
        "s2": { ... },
        ...
      },
      ...
    ]
    """
    try:
        week = get_timetable_week_with_details(user_id)
        return jsonify({"success": True, "week": week}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Get today's schedule ──────────────────────────────────────────────────────
@app.route('/api/attendance/today/<int:user_id>', methods=['GET'])
def todays_schedule(user_id):
    try:
        today = get_todays_schedule(user_id)
        return jsonify({"success": True, "data": today}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Mark attendance ───────────────────────────────────────────────────────────
@app.route('/api/attendance/mark', methods=['POST'])
def mark_student_attendance():
    """
    Expected JSON:
    {
      "user_id": 1,
      "records": [
        { "subject_id": 1, "slot_key": "s1", "time_slot": "8:15-10:15", "status": "Present" },
        { "subject_id": 2, "slot_key": "s2", "time_slot": "10:30-11:30", "status": "Absent" }
      ]
    }
    """
    data    = request.get_json()
    user_id = data.get('user_id')
    records = data.get('records', [])

    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    if not records:
        return jsonify({"success": False, "error": "No records provided"}), 400

    try:
        saved = mark_attendance(user_id, records)
        return jsonify({
            "success": True,
            "message": f"Attendance marked for {saved} classes"
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Attendance summary ────────────────────────────────────────────────────────
@app.route('/api/attendance/summary/<int:user_id>', methods=['GET'])
def attendance_summary(user_id):
    try:
        summary = get_attendance_summary(user_id)
        return jsonify({"success": True, "summary": summary}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)