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

    try:
        image_bytes = file.read()
        result = extract_subjects_from_image(image_bytes)
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/timetable/save-subjects', methods=['POST'])
def save_subjects():
    """
    Saves confirmed subjects to the database.
    
    Expected JSON body:
    {
      "user_id": 1,
      "subjects": [
        {"full": "Advanced Data Structures", "type": ["Theory"]},
        {"full": "Java Programming",          "type": ["Theory", "Practical"]},
        {"full": "Computer Networks Lab",     "type": ["Practical"]}
      ]
    }
    """
    data = request.get_json()

    user_id  = data.get('user_id')
    subjects = data.get('subjects', [])

    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400

    if not subjects:
        return jsonify({"success": False, "error": "No subjects provided"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Delete existing subjects for this user first (fresh save)
        cursor.execute("DELETE FROM subjects WHERE user_id = %s", (user_id,))

        # Insert each subject
        for subject in subjects:
            name = subject.get('full', '').strip()
            types = subject.get('type', ['Theory'])

            if not name:
                continue

            # Convert type array to string
            # ['Theory'] → 'Theory'
            # ['Practical'] → 'Practical'
            # ['Theory', 'Practical'] → 'Both'
            if 'Theory' in types and 'Practical' in types:
                type_str = 'Both'
            elif 'Practical' in types:
                type_str = 'Practical'
            else:
                type_str = 'Theory'

            cursor.execute("""
                INSERT INTO subjects (user_id, subject_name, type, total_classes, attended_classes)
                VALUES (%s, %s, %s, 0, 0)
            """, (user_id, name, type_str))

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


if __name__ == "__main__":
    app.run(debug=True)