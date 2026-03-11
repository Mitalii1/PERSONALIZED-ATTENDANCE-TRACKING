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

    data = request.json
    name = data["name"]
    email = data["email"]
    password = data["password"]
    year = data["year"]

    conn = get_connection()
    cur = conn.cursor()

    query = """
    INSERT INTO students (name,email,password,year)
    VALUES (%s,%s,%s,%s)
    """

    cur.execute(query,(name,email,password,year))
    conn.commit()

    cur.close()
    conn.close()

    return jsonify({"message":"Signup successful"})


# LOGIN API
@app.route("/login", methods=["POST"])
def login():

    data = request.json
    email = data["email"]
    password = data["password"]

    conn = get_connection()
    cur = conn.cursor()

    query = """
    SELECT * FROM students
    WHERE email=%s AND password=%s
    """

    cur.execute(query,(email,password))
    user = cur.fetchone()

    cur.close()
    conn.close()

    if user:
        return jsonify({"message":"Login successful"})
    else:
        return jsonify({"message":"Invalid login"})


if __name__ == "__main__":
    app.run(debug=True)