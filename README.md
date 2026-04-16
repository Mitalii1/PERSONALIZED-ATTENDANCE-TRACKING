# Personalized Attendance Tracking System

AI-assisted attendance tracking with timetable extraction, attendance marking, and actionable analytics for students.

## Overview

This project is a full-stack web app with:

- React frontend for authentication, timetable setup, dashboard, and analytics
- Flask backend for authentication, timetable processing, and attendance APIs
- MySQL as the persistent data store
- Groq Vision integration for timetable extraction from images

## Key Features

- Secure signup/login with password hashing (Werkzeug)
- Session persistence in browser local storage
- Timetable image upload and AI extraction
- Batch-aware timetable extraction (S1, S2, S3)
- Subject mapping and timetable save flow
- Editable timetable slots with auto-save
- Attendance marking per slot
- Subject-wise attendance summary
- Analytics with trend forecasting and risk suggestions
- Responsive premium dashboard UI

## Tech Stack

Frontend:

- React 19
- CSS
- JavaScript

Backend:

- Python 3
- Flask
- Flask-CORS
- PyMySQL
- python-dotenv
- Groq SDK
- Werkzeug

Database:

- MySQL

## Project Structure

```text
PERSONALIZED-ATTENDANCE-TRACKING/
|-- README.md
|-- Frontend.md
|-- backend/
|   |-- app.py
|   |-- attendance.py
|   |-- db.py
|   |-- timetable_ai.py
|   |-- attendance_db.sql
|   |-- .env
|   `-- venv/ (optional local env)
`-- forntend/
    |-- package.json
    |-- public/
    `-- src/
        |-- App.js
        |-- Components/
        |   |-- Dashboard.js
        |   |-- Timetable.js
        |   |-- SubjectMapper.js
        |   `-- Getstarted.js
        `-- Pages/
            |-- First.js
            `-- Second.js
```

Note: the frontend folder name is forntend (intentional current repo name).

## Quick Start (Windows)

## 1) Database

1. Create a MySQL database named attendance_db.
2. Ensure the required tables exist:
   - users
   - subjects
   - timetable_schedule
   - attendance

Important:

- users table is auto-created by backend on first signup/login.
- Other tables must already exist in your DB.

## 2) Backend Setup

From project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install flask flask-cors python-dotenv pymysql groq werkzeug
```

Create backend/.env:

```env
GROQ_API_KEY=your_groq_api_key_here
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DB=attendance_db
```

Run backend:

```powershell
python app.py
```

Backend default URL:

- http://localhost:5000

## 3) Frontend Setup

From project root:

```powershell
cd forntend
npm install
npm start
```

Frontend default URL:

- http://localhost:3000

Optional frontend env (forntend/.env):

```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

## Production Build

```powershell
cd forntend
npm run build
```

## API Summary

Auth:

- POST /signup
- POST /login

Timetable:

- POST /api/timetable/extract
- POST /api/timetable/save-subjects
- GET /api/subjects/<user_id>
- GET /api/timetable/week/<user_id>
- GET /api/timetable/week-details/<user_id>
- PUT /api/timetable/update-slot

Attendance:

- GET /api/attendance/today/<user_id>
- POST /api/attendance/mark
- GET /api/attendance/summary/<user_id>

## User Flow

New user:

1. Sign up
2. Upload timetable image and select batch
3. Confirm detected subjects
4. Save timetable
5. Use dashboard, attendance, and analytics

Returning user:

1. Login
2. Continue from dashboard with saved data

## Notes

- Friday has special practical rendering logic in the UI.
- Timetable extraction supports PNG, JPG, JPEG, and WEBP.
- Invalid or unclear timetable images can fail extraction; retry with clearer images.
- If backend cannot reach MySQL, API responses return errors shown in frontend.

## License

ISC. See LICENSE for details.
