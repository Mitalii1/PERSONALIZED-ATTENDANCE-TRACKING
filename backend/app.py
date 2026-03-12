from flask import Flask, request, jsonify
from flask_cors import CORS
from db import get_connection

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return "Attendance Backend Running"


# SIGNUP API
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.json
        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()
        year = data.get("year", "")

        # Validate input
        if not name or not email or not password or not year:
            return jsonify({"message": "Please provide all required fields"}), 400

        conn = get_connection()
        cur = conn.cursor()

        # Check if email already exists
        check_query = "SELECT email FROM students WHERE email=%s"
        cur.execute(check_query, (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"message": "Email already registered"}), 409

        # Insert new student
        query = """
        INSERT INTO students (name,email,password,year)
        VALUES (%s,%s,%s,%s)
        """

        cur.execute(query, (name, email, password, year))
        conn.commit()

        cur.close()
        conn.close()

        return jsonify({"message": "Signup successful"}), 201
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

        conn = get_connection()
        cur = conn.cursor()

        query = """
        SELECT * FROM students
        WHERE email=%s AND password=%s
        """

        cur.execute(query, (email, password))
        user = cur.fetchone()

        cur.close()
        conn.close()

        if user:
            return jsonify({"message": "Login successful", "user": user}), 200
        else:
            return jsonify({"message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)